import { Router } from 'express';
import { db } from '../db/index.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const bookmarks = await db.getBookmarks(userId);
    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { article_id, title, description, content, url, url_to_image, published_at, source_name, category } = req.body;

    if (!article_id || !title || !url) {
      return res.status(400).json({ error: 'Article ID, title, and URL are required' });
    }

    const bookmark = await db.addBookmark({
      user_id: userId,
      article_id,
      title,
      description: description || '',
      content: content || '',
      url,
      url_to_image: url_to_image || '',
      published_at: published_at || new Date().toISOString(),
      source_name: source_name || 'News Source',
      category: category || 'General',
    });

    res.status(201).json({ bookmark });
  } catch (err) {
    next(err);
  }
});

router.post('/sync', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { bookmarks } = req.body;

    if (Array.isArray(bookmarks)) {
      for (const item of bookmarks) {
        if (item.article_id && item.title && item.url) {
          await db.addBookmark({
            user_id: userId,
            article_id: item.article_id,
            title: item.title,
            description: item.description || '',
            content: item.content || '',
            url: item.url,
            url_to_image: item.url_to_image || item.urlToImage || '',
            published_at: item.published_at || item.publishedAt || new Date().toISOString(),
            source_name: item.source_name || item.sourceName || 'News Source',
            category: item.category || 'General',
          });
        }
      }
    }

    const updated = await db.getBookmarks(userId);
    res.json({ bookmarks: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:articleId', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { articleId } = req.params;

    const removed = await db.removeBookmark(userId, articleId);
    if (!removed) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ success: true, message: 'Bookmark removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
