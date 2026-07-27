import { Router } from 'express';
import { AuthenticatedRequest, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { enforceGuestLimit } from '../middleware/guestLimitMiddleware.js';
import { geminiService } from '../services/geminiService.js';

const router = Router();

router.post('/generate', optionalAuthMiddleware, enforceGuestLimit('ai'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { articleId, title, content, url, language } = req.body;
    if (!articleId || !title) {
      return res.status(400).json({ error: 'Article ID and Title are required to generate AI summary' });
    }

    const summary = await geminiService.generateSummary(
      articleId,
      title,
      content || title,
      url || 'https://news.google.com',
      language || 'en'
    );

    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

export default router;
