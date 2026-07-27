import { Router } from 'express';
import { db } from '../db/index.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/interests', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const interests = await db.getUserInterests(userId);
    res.json({ interests });
  } catch (err) {
    next(err);
  }
});

router.put('/interests', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { interests } = req.body;
    if (!Array.isArray(interests)) {
      return res.status(400).json({ error: 'Interests must be an array of category strings' });
    }

    const updated = await db.setUserInterests(userId, interests);
    res.json({ interests: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/interaction', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { topic } = req.body;
    if (topic && typeof topic === 'string') {
      await db.recordUserInteraction(userId, topic);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
