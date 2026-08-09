import assert from 'node:assert';
import { test } from 'node:test';
import { newsService } from '../server/providers/NewsService.ts';
import { normalizeCoverageData } from '../src/components/news/coverageData.ts';

function article(partial = {}) {
  const id = partial.id ?? `art_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    title: partial.title ?? 'ISRO launches Gaganyaan crew escape test',
    description: partial.description ?? 'ISRO successfully tested the crew escape system.',
    content: 'Full body',
    url: partial.url ?? `https://news.example/${id}`,
    urlToImage: 'img.jpg',
    publishedAt: partial.publishedAt ?? new Date().toISOString(),
    source: partial.source ?? { name: 'Source A' },
    category: partial.category ?? 'Science',
    ...partial,
  };
}

test('Coverage comparison: 2+ distinct sources produce a real comparison', () => {
  const earlier = article({
    id: 'cmp_earlier',
    source: { name: 'The Hindu' },
    publishedAt: '2026-08-01T10:00:00.000Z',
    title: 'ISRO launches Gaganyaan crew escape test',
    description: 'ISRO tested the crew escape system today.',
  });
  const later = article({
    id: 'cmp_later',
    source: { name: 'NDTV' },
    publishedAt: '2026-08-01T12:00:00.000Z',
    title: 'Gaganyaan escape test successful, says ISRO',
    description: 'NDTV confirms the escape test was a success.',
  });

  // Via an articles array (what the StoryCard cluster sends).
  const viaArticles = newsService.generateCoverageComparison({ article: earlier, articles: [earlier, later] });
  assert.strictEqual(viaArticles.sufficientCoverage, true);
  assert.strictEqual(viaArticles.sourceCount, 2);
  assert.ok(viaArticles.whatChanged.includes('Story evolved'), 'real comparison path expected');
  assert.ok(viaArticles.previousCoverage.includes('The Hindu'), 'earlier coverage is the first report');
  assert.ok(viaArticles.latestCoverage.includes('NDTV'), 'latest coverage is the newest report');

  // Via a story cluster shape (the /news/compare-coverage route contract).
  const viaCluster = newsService.generateCoverageComparison({ cluster: { articles: [earlier, later] } });
  assert.strictEqual(viaCluster.sufficientCoverage, true);
  assert.strictEqual(viaCluster.sourceCount, 2);
});

test('Coverage comparison: only 1 distinct source -> honest insufficient state', () => {
  const single = article({ id: 'cmp_single', source: { name: 'PTI' } });

  const result = newsService.generateCoverageComparison({ article: single });
  assert.strictEqual(result.sufficientCoverage, false);
  assert.strictEqual(result.sourceCount, 1);
  assert.ok(result.whatChanged.includes('Not enough independent coverage to compare yet.'));
  assert.ok(result.message.includes('Not enough independent coverage to compare yet.'));

  // Two syndicated copies of the same publisher still count as one source.
  const dupA = article({ id: 'cmp_dup_a', source: { name: 'PTI' }, title: 'Union budget tabled' });
  const dupB = article({ id: 'cmp_dup_b', source: { name: 'PTI' }, title: 'Union budget tabled today' });
  const duplicates = newsService.generateCoverageComparison({ articles: [dupA, dupB] });
  assert.strictEqual(duplicates.sufficientCoverage, false);
  assert.strictEqual(duplicates.sourceCount, 1, 'same publisher must never count as real coverage');
});

test('Coverage comparison: malformed/empty input never throws and stays well-formed', () => {
  assert.doesNotThrow(() => newsService.generateCoverageComparison(null));
  assert.doesNotThrow(() => newsService.generateCoverageComparison(undefined));
  assert.doesNotThrow(() => newsService.generateCoverageComparison({}));
  assert.doesNotThrow(() => newsService.generateCoverageComparison({ articles: [] }));
  assert.doesNotThrow(() => newsService.generateCoverageComparison({ article: null }));

  const empty = newsService.generateCoverageComparison({});
  assert.strictEqual(empty.sufficientCoverage, false);
  assert.strictEqual(typeof empty.previousCoverage, 'string');
  assert.strictEqual(typeof empty.latestCoverage, 'string');
  assert.strictEqual(typeof empty.whatChanged, 'string');
});

test('Coverage comparison: malformed/empty server response cannot crash the modal (normalizeCoverageData)', () => {
  assert.strictEqual(normalizeCoverageData(null), null);
  assert.strictEqual(normalizeCoverageData(undefined), null);
  assert.strictEqual(normalizeCoverageData([]), null);
  assert.strictEqual(normalizeCoverageData('nope'), null);
  assert.strictEqual(normalizeCoverageData(42), null);

  const coerced = normalizeCoverageData({ previousCoverage: 123, whatChanged: ['array'] });
  assert.deepStrictEqual(coerced, {
    previousCoverage: '',
    latestCoverage: '',
    whatChanged: '',
    sufficientCoverage: false,
    message: undefined,
  });

  const valid = normalizeCoverageData({
    previousCoverage: 'a',
    latestCoverage: 'b',
    whatChanged: 'c',
    sufficientCoverage: true,
  });
  assert.deepStrictEqual(valid, {
    previousCoverage: 'a',
    latestCoverage: 'b',
    whatChanged: 'c',
    sufficientCoverage: true,
    message: undefined,
  });

  const insufficient = normalizeCoverageData({
    previousCoverage: 'a',
    latestCoverage: 'a',
    whatChanged: 'Not enough independent coverage to compare yet.',
    sufficientCoverage: false,
    message: 'Not enough independent coverage to compare yet.',
  });
  assert.strictEqual(insufficient.sufficientCoverage, false);
  assert.ok(insufficient.message.includes('Not enough independent coverage'));
});
