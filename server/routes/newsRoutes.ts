import { Router } from 'express';
import { db } from '../db/index.js';
import { AuthenticatedRequest, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { enforceGuestLimit } from '../middleware/guestLimitMiddleware.js';
import { newsService } from '../providers/NewsService.js';
import { geminiService } from '../services/geminiService.js';
import { guestService } from '../services/guestService.js';
import { misinformationService } from '../services/misinformationService.js';
import { ragService } from '../services/ragService.js';

const router = Router();

// Guest Usage Status Endpoint
router.get('/guest/status', optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
  const guestId = (req.headers['x-guest-id'] as string) || req.ip || 'anonymous_guest';
  const status = guestService.getGuestStatus(guestId);
  res.json({ isAuthenticated: !!req.user, ...status });
});

// Track Article Open for Guests and record behavioral interaction
router.post('/articles/:id/open', optionalAuthMiddleware, enforceGuestLimit('article'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const guestId = (req.headers['x-guest-id'] as string) || req.ip || 'anonymous_guest';
    const userId = req.user?.userId || guestId;
    const { category, topic } = req.body;

    if (category || topic) {
      await db.recordUserInteraction(userId, category || topic);
    }

    const status = guestService.getGuestStatus(guestId);
    res.json({ ok: true, status });
  } catch (err) {
    next(err);
  }
});

// Record user interaction for behavioral learning
router.post('/interaction', optionalAuthMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const guestId = (req.headers['x-guest-id'] as string) || req.ip || 'anonymous_guest';
    const userId = req.user?.userId || guestId;
    const { topic } = req.body;

    if (topic) {
      await db.recordUserInteraction(userId, topic);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Personalized News Feed
router.get('/feed', optionalAuthMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const scope = (req.query.scope as 'india' | 'world' | 'all') || 'all';
    let userInterests = ['Technology', 'AI & ML', 'Business', 'Science'];
    const userId = req.user?.userId;
    if (userId) {
      const dbInterests = await db.getUserInterests(userId);
      if (dbInterests.length > 0) {
        userInterests = dbInterests;
      }
    }

    const data = await newsService.getPersonalizedFeed(userInterests, userId, scope);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// News Category Endpoint
router.get('/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const scope = (req.query.scope as 'india' | 'world' | 'all') || 'all';
    const data = await newsService.getNewsByCategory(category, scope);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Search News
router.get('/search', optionalAuthMiddleware, enforceGuestLimit('search'), async (req, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    const scope = (req.query.scope as 'india' | 'world' | 'all') || 'all';
    const data = await newsService.searchNews(query, scope);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Signal-driven Trending Endpoint
router.get('/trending', async (req, res, next) => {
  try {
    const scope = (req.query.scope as 'india' | 'world' | 'all') || 'all';
    const data = await newsService.getTrendingNews(scope);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Real Story Clusters Endpoint
router.get('/clusters', async (req, res, next) => {
  try {
    const scope = (req.query.scope as 'india' | 'world' | 'all') || 'all';
    const clusterData = await newsService.getStoryClusters(scope);
    res.json(clusterData);
  } catch (err) {
    next(err);
  }
});

// Misinformation Risk Evaluation Endpoint
router.post('/misinformation-risk', async (req, res, next) => {
  try {
    const { article } = req.body;
    if (!article) {
      return res.status(400).json({ error: 'Article object is required' });
    }
    const assessment = await misinformationService.evaluateArticleRisk(article);
    res.json(assessment);
  } catch (err) {
    next(err);
  }
});

// Grounded 60-Second RAG Briefing Endpoint
router.post('/rag/briefing', optionalAuthMiddleware, enforceGuestLimit('ai'), async (req, res, next) => {
  try {
    const { cluster } = req.body;
    if (!cluster) {
      return res.status(400).json({ error: 'Story cluster object required' });
    }
    const briefing = await ragService.generateStoryBriefing(cluster);
    res.json(briefing);
  } catch (err) {
    next(err);
  }
});

// Compare Coverage Endpoint
router.post('/compare-coverage', async (req, res, next) => {
  try {
    const { article } = req.body;
    if (!article) {
      return res.status(400).json({ error: 'Article object required for comparison' });
    }
    const comparison = newsService.generateCoverageComparison(article);
    res.json(comparison);
  } catch (err) {
    next(err);
  }
});

// Translate Article
router.post('/translate', optionalAuthMiddleware, enforceGuestLimit('ai'), async (req, res, next) => {
  try {
    const { title, description, content, targetLanguage } = req.body;
    if (!title || !targetLanguage) {
      return res.status(400).json({ error: 'Title and targetLanguage are required' });
    }
    const result = await geminiService.translateArticle(
      title,
      description || '',
      content || '',
      targetLanguage
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
