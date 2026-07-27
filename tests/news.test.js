import assert from 'node:assert';
import { test } from 'node:test';
import { CuratedRSSProvider } from '../server/providers/CuratedRSSProvider.js';

test('CuratedRSSProvider returns default news headlines', async () => {
  const provider = new CuratedRSSProvider();
  const headlines = await provider.fetchHeadlines();
  assert.ok(Array.isArray(headlines), 'Headlines should be an array');
  assert.ok(headlines.length > 0, 'Headlines should not be empty');
  assert.ok(headlines[0].title, 'Article should contain a title');
});

test('CuratedRSSProvider filters news by category', async () => {
  const provider = new CuratedRSSProvider();
  const headlines = await provider.fetchHeadlines({ category: 'AI & ML' });
  assert.ok(headlines.length > 0, 'Category fetch should return articles');
});

test('CuratedRSSProvider searches news', async () => {
  const provider = new CuratedRSSProvider();
  const results = await provider.searchNews('Quantum');
  assert.ok(results.length > 0, 'Search should return results');
});
