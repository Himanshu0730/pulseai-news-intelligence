import assert from 'node:assert';
import { test } from 'node:test';
import { generateDeterministicArticleId, normalizeUrl, calculateTextSimilarity } from '../server/utils/urlNormalizer.js';
import { deduplicationService } from '../server/services/deduplicationService.js';
import { clusteringService } from '../server/services/clusteringService.js';
import { trendService } from '../server/services/trendService.js';
import { personalizationService } from '../server/services/personalizationService.js';
import { misinformationService } from '../server/services/misinformationService.js';

test('URL Normalization & Deterministic Article ID Generation', () => {
  const rawUrl1 = 'https://www.reuters.com/technology/ai-breakthrough/?utm_source=twitter&utm_medium=social&ref=123#top';
  const rawUrl2 = 'https://reuters.com/technology/ai-breakthrough';

  const norm1 = normalizeUrl(rawUrl1);
  const norm2 = normalizeUrl(rawUrl2);

  assert.strictEqual(norm1, norm2, 'Normalized URLs should be identical regardless of UTM tracking parameters');

  const id1 = generateDeterministicArticleId(norm1, 'AI Breakthrough');
  const id2 = generateDeterministicArticleId(norm2, 'AI Breakthrough');

  assert.strictEqual(id1, id2, 'Generated article IDs must be strictly deterministic across refetches');
});

test('Layered Deduplication Service', () => {
  const articles = [
    {
      id: 'art_1',
      title: 'ISRO Launches Gaganyaan Test Flight Successfully',
      description: 'ISRO executed a flawless escape system simulation.',
      content: 'Content 1',
      url: 'https://isro.gov.in/news/1?utm_source=rss',
      urlToImage: 'http://img1.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'ISRO Press' },
      category: 'Science',
    },
    {
      id: 'art_2',
      title: 'ISRO Launches Gaganyaan Test Flight Successfully Today',
      description: 'ISRO executed a flawless escape system simulation.',
      content: 'Content 2',
      url: 'https://isro.gov.in/news/1', // Same canonical URL
      urlToImage: 'http://img1.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'ISRO Press Mirror' },
      category: 'Science',
    },
  ];

  const result = deduplicationService.deduplicateArticles(articles);
  assert.strictEqual(result.uniqueArticles.length, 1, 'Duplicate article should be merged by canonical URL');
  assert.strictEqual(result.duplicatesRemovedCount, 1, 'Should report 1 duplicate removed');
});

test('Real Story Clustering Engine', () => {
  const articles = [
    {
      id: 'art_cluster_1',
      title: 'India Semiconductor Mission Approves New Fab Facilities',
      description: 'Union Cabinet allocates capital for chip plants in Gujarat.',
      content: 'Full body 1',
      url: 'https://pib.gov.in/1',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'PIB' },
      category: 'Technology',
      region: 'India',
    },
    {
      id: 'art_cluster_2',
      title: 'India Semiconductor Mission Approves New Chip Plants in Gujarat and Assam',
      description: 'Cabinet announces $10B allocation for semiconductor manufacturing.',
      content: 'Full body 2',
      url: 'https://thehindu.com/2',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'The Hindu' },
      category: 'Technology',
      region: 'India',
    },
  ];

  const { clusters } = clusteringService.clusterArticles(articles);
  assert.ok(clusters.length > 0, 'Should cluster related stories together');
  assert.strictEqual(clusters[0].distinctPublisherCount, 2, 'Cluster should track 2 distinct publishers');
});

test('Clustering keeps unrelated stories as unclustered (never silently lost)', () => {
  const articles = [
    {
      id: 'art_uncl_1',
      title: 'ISRO launches Gaganyaan crew escape test successfully',
      description: 'ISRO tested the crew escape system in flight today.',
      content: 'Full body 1',
      url: 'https://pib.gov.in/3',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'PIB' },
      category: 'Science',
      region: 'India',
    },
    {
      id: 'art_uncl_2',
      title: 'Gaganyaan crew escape test successful, says ISRO',
      description: 'The escape test validated crew safety systems.',
      content: 'Full body 2',
      url: 'https://thehindu.com/4',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'The Hindu' },
      category: 'Science',
      region: 'India',
    },
    {
      id: 'art_uncl_3',
      title: 'Monsoon session of parliament adjourned',
      description: 'Parliament debate on the finance bill was cut short.',
      content: 'Full body 3',
      url: 'https://timesnow.com/5',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'Times Now' },
      category: 'World News',
    },
  ];

  const { clusters, unclusteredArticles } = clusteringService.clusterArticles(articles);
  assert.ok(clusters.length >= 1, 'related stories should still cluster together');
  assert.ok(clusters.some((cl) => cl.articles.length >= 2), 'the two ISRO reports cluster into one story');
  assert.ok(unclusteredArticles.some((a) => a.id === 'art_uncl_3'), 'the unrelated story remains visible as unclustered, never dropped');
});

test('Signal-Based Trend Detection', () => {
  const articles = [
    {
      id: 'art_trend_1',
      title: 'AI Supercomputing Grid Expanded Nationwide',
      description: 'India expands GPU infrastructure across research centers.',
      content: 'Content',
      url: 'https://news.com/1',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'Tech Desk' },
      category: 'AI & ML',
      corroboratingSourcesCount: 10,
    },
  ];

  const result = trendService.analyzeTrends(articles, { art_trend_1: 5 });
  assert.ok(result.trendingArticles[0].trendScore > 50, 'High corroboration + high engagement article should score high trend value');
  assert.ok(result.topDynamicTopics.length > 0, 'Top dynamic topics list should be non-empty');
});

test('Behavioral Personalization Ranking', () => {
  const articles = [
    {
      id: 'art_p1',
      title: 'New AI Model Advances Drug Discovery',
      description: 'Frontier AI models synthesize biomedical data.',
      content: 'Content',
      url: 'https://mit.edu/1',
      urlToImage: 'img.jpg',
      publishedAt: new Date().toISOString(),
      source: { name: 'MIT Tech Review' },
      category: 'AI & ML',
      readTimeMinutes: 5,
    },
  ];

  const ranked = personalizationService.rankArticles(articles, ['AI & ML'], { 'AI & ML': 10 });
  assert.ok(ranked[0].personalizationScore > 60, 'Article matching explicit interest and behavioral topic should receive a high personalization score');
  assert.ok(ranked[0].explanationTag.includes('AI & ML'), 'Explanation tag should explicitly name the matching interest/topic');
});

test('Misinformation Risk Pipeline', async () => {
  const dubiousArticle = {
    id: 'art_dubious',
    title: 'SHOCKING: Viral Notice Claims New Mandatory Capital Gains Tax',
    description: 'Unverified social media circular claims 5% surcharge on mutual funds.',
    content: 'Full details',
    url: 'https://socialmedia.com/post',
    urlToImage: 'img.jpg',
    publishedAt: new Date().toISOString(),
    source: { name: 'Social Blog' },
    category: 'Business',
    corroboratingSourcesCount: 1,
    factCheckStatus: {
      available: true,
      publisher: 'PIB Fact Check',
      claim: 'New 5% surcharge',
      verdict: 'FALSE',
    },
  };

  const assessment = await misinformationService.evaluateArticleRisk(dubiousArticle);
  assert.strictEqual(assessment.riskLevel, 'High Risk', 'Article with official FALSE verdict should be classified as High Risk');
  assert.ok(assessment.reasons.length > 0, 'Should provide explicit reasons for risk assessment');
});
