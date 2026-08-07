import assert from 'node:assert';
import { test } from 'node:test';
import { CuratedRSSProvider } from '../server/providers/CuratedRSSProvider.js';
import { newsService } from '../server/providers/NewsService.ts';

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
  assert.ok(Array.isArray(headlines), 'Category fetch should return an array');
});

test('CuratedRSSProvider searches news', async () => {
  const provider = new CuratedRSSProvider();
  const results = await provider.searchNews('Tech');
  assert.ok(results.length > 0, 'Search should return results');
});

test('NewsService Aggregation & Personalization Feed', async () => {
  const result = await newsService.getPersonalizedFeed(['Technology', 'AI & ML', 'Business']);
  assert.ok(Array.isArray(result.articles), 'Personalized feed should return an array');
  assert.ok(result.articles.length > 0, 'Personalized feed should contain articles');
  assert.ok(result.activeProvider, 'Should indicate active aggregation engine provider label');
});

test('NewsService Strict Category Isolation', async () => {
  const sportsFeed = await newsService.getNewsByCategory('Sports');
  assert.ok(Array.isArray(sportsFeed.articles), 'Category feed should return array');
  // If sports stories exist, all should be sports-related; no semiconductor or RBI leaks!
  sportsFeed.articles.forEach((art) => {
    const text = `${art.title} ${art.description} ${art.category}`.toLowerCase();
    const isSportsOrGeneric = text.includes('sport') || text.includes('espn') || text.includes('football') || text.includes('cricket') || text.includes('match') || text.includes('cup') || art.category.toLowerCase().includes('sport');
    assert.ok(isSportsOrGeneric || sportsFeed.articles.length === 0, 'Category result must strictly match category without off-topic leaks');
  });
});
