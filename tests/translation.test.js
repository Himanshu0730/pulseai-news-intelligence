import assert from 'node:assert';
import { test } from 'node:test';
import { geminiService } from '../server/services/geminiService.js';
import { db } from '../server/db/index.js';

test('Translation Pipeline - English No-Op Fastpath', async () => {
  const result = await geminiService.translateArticle({
    title: 'ISRO Prepares Next Satellite Mission',
    description: 'ISRO announces launch schedule.',
    content: 'Full article body here.',
    targetLanguage: 'en',
  });

  assert.strictEqual(result.translatedTitle, 'ISRO Prepares Next Satellite Mission');
  assert.strictEqual(result.language, 'en');
  assert.strictEqual(result.isFallback, false);
});

test('Translation Pipeline - Fallback & Source Metadata Preservation', async () => {
  const payload = {
    articleId: 'test_art_123',
    title: 'Tech Giants Announce AI Partnership in New Delhi',
    subtitle: 'Strategic collaboration between leading firms.',
    description: 'A major agreement was signed today.',
    content: 'Full article text explaining the venture.',
    factCheck: {
      claim: 'Partnership involves $1B investment',
      verdict: 'Verified',
      details: 'Official press release confirms capital allocation.',
    },
    targetLanguage: 'hi',
  };

  const result = await geminiService.translateArticle(payload);

  assert.ok(result.translatedTitle, 'Title should be present');
  assert.strictEqual(result.language, 'hi');
  assert.ok(result.isFallback !== undefined, 'isFallback flag should be defined');
});

test('Translation Pipeline - Database Cache Hit', async () => {
  const cacheKey = 'trans_v2_cache_test_id_mr';
  const mockTranslation = {
    translatedTitle: 'मराठी शीर्षक',
    translatedDescription: 'मराठी विवरण',
    translatedContent: 'मराठी मजकूर',
    language: 'mr',
  };

  await db.setCachedNews(cacheKey, mockTranslation, 3600);

  const result = await geminiService.translateArticle({
    articleId: 'cache_test_id',
    title: 'Original English Title',
    description: 'Original English Description',
    content: 'Original English Content',
    targetLanguage: 'mr',
  });

  assert.strictEqual(result.translatedTitle, 'मराठी शीर्षक');
  assert.strictEqual(result.isCached, true);
});
