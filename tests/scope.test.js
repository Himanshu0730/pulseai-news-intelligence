import assert from 'node:assert';
import { test } from 'node:test';
import {
  detectArticleRegion,
  filterArticlesByScope,
  isIndiaArticle,
  normalizeArticleRegions,
} from '../server/services/geoScopeService.ts';
import { personalizationService } from '../server/services/personalizationService.ts';

const baseArticle = (partial = {}) => ({
  id: `art_${Math.random().toString(36).slice(2)}`,
  title: 'Sample headline',
  description: 'Sample description text.',
  content: 'Full body',
  url: 'https://example.com/story',
  urlToImage: 'https://img.jpg',
  publishedAt: new Date().toISOString(),
  source: { name: 'Unknown Source' },
  category: 'General',
  ...partial,
});

const indiaArticle = (partial = {}) =>
  baseArticle({
    title: 'Cabinet clears new semiconductor mission in Gujarat',
    description: 'Union Cabinet approves funding for chip fabrication plants.',
    source: { name: 'The Hindu' },
    region: 'India',
    ...partial,
  });

const worldArticle = (partial = {}) =>
  baseArticle({
    title: 'Global markets rally after central bank rate decision',
    description: 'Wall Street and European bourses post strong gains.',
    source: { name: 'Reuters' },
    region: 'Global',
    ...partial,
  });

const undecoratedArticle = (partial = {}) => baseArticle({ ...partial });

test('1. detectArticleRegion infers India from Indian outlet names and Global from international outlets', () => {
  assert.strictEqual(detectArticleRegion(baseArticle({ source: { name: 'Times of India' } })), 'India');
  assert.strictEqual(detectArticleRegion(baseArticle({ source: { name: 'NDTV' } })), 'India');
  assert.strictEqual(detectArticleRegion(baseArticle({ source: { name: 'BBC News' } })), 'Global');
  assert.strictEqual(detectArticleRegion(baseArticle({ source: { name: 'Reuters' } })), 'Global');
  assert.strictEqual(
    detectArticleRegion(baseArticle({ source: { name: 'The Hindu' }, url: 'https://thehindu.com/a' })),
    'India'
  );
});

test('2. detectArticleRegion respects an explicit region and leaves unknowns undefined', () => {
  assert.strictEqual(detectArticleRegion(baseArticle({ region: 'Indian State' })), 'Indian State');
  assert.strictEqual(detectArticleRegion(undecoratedArticle()), undefined);
});

test('3. normalizeArticleRegions fills missing regions and preserves existing ones', () => {
  const articles = normalizeArticleRegions([
    baseArticle({ source: { name: 'Hindustan Times' } }),
    baseArticle({ source: { name: 'The Guardian' } }),
    worldArticle(),
    undecoratedArticle(),
  ]);
  assert.strictEqual(articles[0].region, 'India');
  assert.strictEqual(articles[1].region, 'Global');
  assert.strictEqual(articles[2].region, 'Global');
  assert.strictEqual(articles[3].region, undefined);
});

test('4. filterArticlesByScope is strict: India keeps only India content, World excludes India, All keeps everything', () => {
  const mixed = [indiaArticle(), worldArticle(), undecoratedArticle()];

  const india = filterArticlesByScope(mixed, 'india');
  assert.strictEqual(india.length, 1, 'India scope must only contain India-tagged articles');
  assert.strictEqual(india[0].region, 'India');

  const world = filterArticlesByScope(mixed, 'world');
  assert.strictEqual(world.length, 2, 'World scope must exclude India-tagged articles');
  assert.ok(world.every((a) => a.region !== 'India'), 'No India-tagged articles may leak into World scope');

  const all = filterArticlesByScope(mixed, 'all');
  assert.strictEqual(all.length, 3, 'All scope must combine every region');

  // Strictness: a scope with no matching content returns EMPTY, not the whole set.
  assert.strictEqual(filterArticlesByScope([worldArticle()], 'india').length, 0, 'No lenient fallback for India scope');
  assert.strictEqual(filterArticlesByScope([indiaArticle()], 'world').length, 0, 'No lenient fallback for World scope');
});

test('5. rankArticles enforces scope strictly end-to-end with no loose fallback', () => {
  const mixed = [indiaArticle(), worldArticle(), undecoratedArticle()];

  const indiaFeed = personalizationService.rankArticles(mixed, ['Technology'], {}, 'india');
  assert.strictEqual(indiaFeed.length, 1, 'India feed must contain only the India article');
  assert.strictEqual(indiaFeed[0].region, 'India');

  const worldFeed = personalizationService.rankArticles(mixed, ['Technology'], {}, 'world');
  assert.ok(worldFeed.every((a) => a.region !== 'India'), 'World feed must contain no India article');

  const allFeed = personalizationService.rankArticles(mixed, ['Technology'], {}, 'all');
  assert.strictEqual(allFeed.length, 3, 'All feed must combine India + Global + undecorated');

  const onlyGlobal = personalizationService.rankArticles([worldArticle()], ['Technology'], {}, 'india');
  assert.strictEqual(onlyGlobal.length, 0, 'India scope with only global content must be empty (strict)');
});

test('6. isIndiaArticle prefers region metadata over title keywords', () => {
  // A Global-region story ABOUT India is not treated as an India article for tagging.
  const globalAboutIndia = worldArticle({
    title: 'India economy grows as foreign investment surges',
    description: 'Indian GDP figures published today.',
  });
  assert.strictEqual(isIndiaArticle(globalAboutIndia), false, 'region metadata wins over title matching');

  assert.strictEqual(isIndiaArticle(indiaArticle()), true);
  assert.strictEqual(
    isIndiaArticle(baseArticle({ source: { name: 'NDTV' }, title: 'Breaking news' })),
    true,
    'source hint still tags India when no explicit region'
  );
  assert.strictEqual(isIndiaArticle(worldArticle()), false);
});

test('7. Google News India (google-news-in) is classified as India and scoped correctly', () => {
  // Real observed shape from the NewsAPI `sources=google-news-in` query: the
  // source id is country-scoped but the URL is the shared news.google.com rss
  // domain, so classification must use the provider source id / edition name.
  const gni = baseArticle({
    source: { id: 'google-news-in', name: 'Google News (India)' },
    url: 'https://news.google.com/rss/articles/CBMivwFBVV95cUxOUnBoc1FCU2pR',
    title: 'Delhi Metro opens new airport corridor',
  });

  assert.strictEqual(detectArticleRegion(gni), 'India', 'google-news-in source id must map to India');

  // Fallback: a provider that drops the id but keeps the edition name.
  const gniNameOnly = baseArticle({
    source: { name: 'Google News (India)' },
    url: 'https://news.google.com/rss/articles/CBMivwFBVV95cUxOUnBoc1FCU2pR',
    title: 'Mumbai monsoon update',
  });
  assert.strictEqual(detectArticleRegion(gniNameOnly), 'India', 'Google News (India) edition name must map to India');

  const normalized = normalizeArticleRegions([gni]);
  assert.strictEqual(normalized[0].region, 'India', 'normalizeArticleRegions must fill region from google-news-in');

  // Scope behavior: India accepts, World excludes, All can include.
  // Match the real pipeline order: normalizeArticleRegions() fills the region
  // field, then filterArticlesByScope() applies the strict scope contract.
  const mixed = normalizeArticleRegions([gni, gniNameOnly, worldArticle()]);

  const india = filterArticlesByScope(mixed, 'india');
  assert.strictEqual(india.length, 2, 'India scope must accept both Google News India articles');
  assert.ok(india.every((a) => a.region === 'India'), 'India scope may only contain India-tagged articles');

  const world = filterArticlesByScope(mixed, 'world');
  assert.strictEqual(world.length, 1, 'World scope must exclude every Google News India article');
  assert.ok(world.every((a) => a.region !== 'India'), 'No India-tagged article may leak into World scope');

  const all = filterArticlesByScope(mixed, 'all');
  assert.strictEqual(all.length, 3, 'All scope may combine Google News India + global content');
});

test('8. Unrelated international Google News articles are NOT classified as India', () => {
  const gnUs = baseArticle({
    source: { id: 'google-news', name: 'Google News' },
    url: 'https://news.google.com/rss/articles/CBMi',
    title: 'US markets close higher',
  });
  const gnUk = baseArticle({
    source: { id: 'google-news-uk', name: 'Google News (UK)' },
    url: 'https://news.google.com/rss/articles/CBMi',
    title: 'Parliament session underway',
  });
  const gnFr = baseArticle({
    source: { id: 'google-news-fr', name: 'Google News (France)' },
    url: 'https://news.google.com/rss/articles/CBMi',
    title: 'Government announces reforms',
  });

  assert.strictEqual(detectArticleRegion(gnUs), undefined, 'US Google News must not be classified India');
  assert.strictEqual(detectArticleRegion(gnUk), undefined, 'UK Google News must not be classified India');
  assert.strictEqual(detectArticleRegion(gnFr), undefined, 'France Google News must not be classified India');

  // India scope must reject every non-India Google News edition.
  assert.strictEqual(filterArticlesByScope([gnUs, gnUk, gnFr], 'india').length, 0, 'No international Google News article may enter India scope');
  // World scope treats them as international (non-India).
  assert.strictEqual(filterArticlesByScope([gnUs, gnUk, gnFr], 'world').length, 3, 'International Google News articles belong to World scope');
});
