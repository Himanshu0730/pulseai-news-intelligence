import assert from 'node:assert';
import { test } from 'node:test';
import { aggregateProviders } from '../server/providers/NewsService.ts';
import { normalizeArticleRegions, filterArticlesByScope } from '../server/services/geoScopeService.ts';

const article = (id) => ({
  id: `art_${id}`,
  title: `Headline ${id}`,
  description: 'Sample description text.',
  content: 'Full body',
  url: `https://example.com/${id}`,
  urlToImage: 'https://img.jpg',
  publishedAt: new Date().toISOString(),
  source: { name: 'Test Source' },
  category: 'General',
});

const articles = (n) => Array.from({ length: n }, (_, i) => article(i));

const fakeProvider = (name, opts = {}) => ({
  name,
  isAvailable: opts.hasOwnProperty('available') ? () => opts.available : undefined,
  fetchHeadlines: async () => {
    if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay));
    if (opts.fail) throw new Error(opts.fail);
    return opts.articles ?? [];
  },
  searchNews: async () => [],
});

const elapsed = async (fn) => {
  const t0 = Date.now();
  const result = await fn();
  return { result, elapsedMs: Date.now() - t0 };
};

test('1. Slow provider is NOT dropped when it is the only source of content (regression: cold-start empty feed)', async () => {
  // The RSS provider settles at ~3s while the aggregate deadline fires at 2500ms.
  // On a cold cache where the only healthy source is that slow feed, the old code
  // returned 0 candidates -> strict India scope -> "No News Found".
  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [fakeProvider('Slow RSS', { delay: 200, articles: articles(5) })],
      {},
      50,
      8
    )
  );

  assert.strictEqual(result.rawArticles.length, 5, 'slow provider results must be included');
  assert.strictEqual(result.allProvidersSettled, true, 'aggregate must wait for the slow provider');
  assert.ok(elapsedMs >= 150, `expected to wait past the deadline for the slow provider (elapsed ${elapsedMs}ms)`);
});

test('2. Fast path is preserved: usable pool returns immediately without waiting for slow providers', async () => {
  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('Fast A', { articles: articles(5) }),
        fakeProvider('Fast B', { articles: articles(5) }),
        fakeProvider('Slow RSS', { delay: 200, articles: articles(5) }),
      ],
      {},
      500,
      8
    )
  );

  assert.ok(result.rawArticles.length >= 8, 'usable pool must be returned');
  assert.strictEqual(result.allProvidersSettled, false, 'slow provider is still running, background refresh folds it in');
  assert.ok(elapsedMs < 200, `must not block on the slow provider (elapsed ${elapsedMs}ms)`);
});

test('3. Providers skipped via isAvailable() resolve immediately without waiting for the deadline', async () => {
  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('Unavailable A', { available: false }),
        fakeProvider('Unavailable B', { available: false }),
      ],
      {},
      1000,
      8
    )
  );

  assert.strictEqual(result.rawArticles.length, 0);
  assert.strictEqual(result.allProvidersSettled, true, 'all unavailable providers are accounted for');
  assert.ok(elapsedMs < 500, `must not wait out the deadline when every provider is unavailable (elapsed ${elapsedMs}ms)`);
});

test('4. Genuinely empty provider results stay empty with all providers settled', async () => {
  const { result } = await elapsed(() =>
    aggregateProviders(
      [fakeProvider('Empty A', { articles: [] }), fakeProvider('Empty B', { articles: [] })],
      {},
      1000,
      8
    )
  );

  assert.strictEqual(result.rawArticles.length, 0);
  assert.strictEqual(result.allProvidersSettled, true);
});

test('5. A failing provider is skipped without blocking the others', async () => {
  const { result } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('Broken', { fail: 'rate limited (429)' }),
        fakeProvider('Healthy', { articles: articles(4) }),
      ],
      {},
      1000,
      8
    )
  );

  assert.strictEqual(result.rawArticles.length, 4, 'healthy provider results must survive a failing peer');
  assert.deepStrictEqual(result.activeProviders, ['Healthy']);
  assert.strictEqual(result.allProvidersSettled, true);
});

test('6. Deadline with partial content returns the partial content without waiting for the straggler', async () => {
  // A few articles have settled: never discard them to wait for the slow feed,
  // and never return empty. Only the "nothing settled yet" case waits.
  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('Fast', { articles: articles(3) }),
        fakeProvider('Slow RSS', { delay: 200, articles: articles(5) }),
      ],
      {},
      50,
      8
    )
  );

  assert.strictEqual(result.rawArticles.length, 3, 'partial results must be returned once content exists');
  assert.strictEqual(result.allProvidersSettled, false, 'slow provider is still running');
  assert.ok(elapsedMs < 150, `must return partial content promptly (elapsed ${elapsedMs}ms)`);
});

test('7. searchNews is used when a query is provided', async () => {
  const searchProvider = {
    name: 'Search API',
    fetchHeadlines: async () => {
      throw new Error('fetchHeadlines must not be called for queries');
    },
    searchNews: async (query) => [article(`q_${query}`)],
  };

  const { result } = await elapsed(() => aggregateProviders([searchProvider], { query: 'crypto' }, 1000, 8));

  assert.strictEqual(result.rawArticles.length, 1);
  assert.strictEqual(result.rawArticles[0].id, 'art_q_crypto');
});

test('8. India-scoped headline fetch waits for the region-tagged RSS provider instead of early-exiting on unlabeled API results', async () => {
  // Real-world race: NewsAPI/GNews (country=in) return plenty of articles but
  // WITHOUT `region` metadata, and their source names are unknown to the
  // geo-scope list, so normalizeArticleRegions() leaves them undefined. The
  // curated RSS provider carries reliable `region: 'India'` metadata but settles
  // after the 2500ms AGGREGATE_DEADLINE_MS (live feeds take ~3s per timeout).
  const unlabeled = Array.from({ length: 12 }, (_, i) => ({
    ...article(`api_${i}`),
    source: { name: 'Example News Hub' },
  }));
  const rssIndia = Array.from({ length: 5 }, (_, i) => ({
    ...article(`rss_${i}`),
    source: { name: 'The Hindu' },
    region: 'India',
  }));

  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('NewsAPI', { articles: unlabeled }),
        fakeProvider('Slow RSS', { delay: 200, articles: rssIndia }),
      ],
      { country: 'in' }, // scope=india headline fetch
      50, // deadline fires well before the RSS provider settles
      8
    )
  );

  assert.strictEqual(result.allProvidersSettled, true, 'must keep waiting for the region-tagged RSS provider');
  assert.ok(result.rawArticles.some((a) => a.region === 'India'), 'region-tagged RSS articles must be included');
  assert.ok(elapsedMs >= 150, `expected to wait for the slow RSS provider (elapsed ${elapsedMs}ms)`);

  // End-to-end: the strict india scope filter must not return an empty feed.
  const scoped = filterArticlesByScope(normalizeArticleRegions(result.rawArticles), 'india');
  assert.ok(scoped.length > 0, 'strict india scope must return a non-empty, correctly-scoped result');
});

test('9. All-scope headline feed keeps the fast early-exit (unlabeled pool is fine when no scope filter applies)', async () => {
  // Scope=all passes country=global; the usable-pool early-exit must still fire
  // so world/all cold starts stay fast. This pins the fast path so the india
  // fix cannot regress the all scope.
  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('NewsAPI', { articles: articles(12) }),
        fakeProvider('Slow RSS', { delay: 200, articles: articles(5) }),
      ],
      { country: 'global' }, // scope=all
      500,
      8
    )
  );

  assert.ok(result.rawArticles.length >= 8, 'usable pool must be returned');
  assert.strictEqual(result.allProvidersSettled, false, 'slow provider still running; background refresh folds it in');
  assert.ok(elapsedMs < 200, `all-scope must keep the fast path (elapsed ${elapsedMs}ms)`);
});

test('10. India scope where RSS also fails/times out: deadline fallback still returns gracefully (no infinite wait)', async () => {
  // Worst case: a fast unlabeled NewsAPI response PLUS an RSS provider that
  // settles with ZERO region-tagged articles (network failure/timeout). The
  // india deadline fallback must not hang forever waiting for region metadata
  // that will never arrive — it returns whatever settled, and the strict scope
  // filter yields an empty (but honest) India feed.
  const unlabeled = Array.from({ length: 12 }, (_, i) => ({
    ...article(`api_${i}`),
    source: { name: 'Example News Hub' },
  }));

  const { result, elapsedMs } = await elapsed(() =>
    aggregateProviders(
      [
        fakeProvider('NewsAPI', { articles: unlabeled }),
        fakeProvider('Slow RSS', { delay: 200, articles: [] }), // fails/times out -> no region-tagged content
      ],
      { country: 'in' }, // scope=india headline fetch
      50,
      8
    )
  );

  assert.strictEqual(result.allProvidersSettled, true, 'aggregate must settle once every provider finishes');
  assert.ok(elapsedMs < 1000, `must not hang for region metadata that never arrives (elapsed ${elapsedMs}ms)`);
  assert.ok(elapsedMs >= 150, `still waited for the RSS provider to settle (elapsed ${elapsedMs}ms)`);
  assert.strictEqual(result.rawArticles.length, 12, 'unlabeled API results are returned, not discarded');

  // Honest empty India feed: the strict scope filter drops the unlabeled pool.
  const scoped = filterArticlesByScope(normalizeArticleRegions(result.rawArticles), 'india');
  assert.strictEqual(scoped.length, 0, 'empty India feed is the correct honest result when no India-tagged content exists');
});
