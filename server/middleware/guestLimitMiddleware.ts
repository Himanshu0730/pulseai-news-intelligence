import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';
import { guestService } from '../services/guestService.js';

export function enforceGuestLimit(actionType: 'article' | 'search' | 'ai') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Authenticated users bypass guest limits
    if (req.user) {
      return next();
    }

    const guestId = (req.headers['x-guest-id'] as string) || req.ip || 'anonymous_guest';

    if (actionType === 'search') {
      const result = guestService.checkAndIncrementSearch(guestId);
      if (!result.allowed) {
        return res.status(403).json({
          error: `Guest search limit (${result.limit}/day) reached. Please sign in or create a free account to perform unlimited searches.`,
          code: 'GUEST_LIMIT_REACHED',
          limitType: 'search',
          limit: result.limit,
        });
      }
    } else if (actionType === 'ai') {
      const result = guestService.checkAndIncrementAi(guestId);
      if (!result.allowed) {
        return res.status(403).json({
          error: `Guest AI limit (${result.limit}/day) reached. Please sign in or create a free account for unlimited AI summaries and translations.`,
          code: 'GUEST_LIMIT_REACHED',
          limitType: 'ai',
          limit: result.limit,
        });
      }
    } else if (actionType === 'article') {
      const result = guestService.checkAndIncrementArticle(guestId);
      if (!result.allowed) {
        return res.status(403).json({
          error: `Guest article limit (${result.limit}/day) reached. Please sign in or create a free account to continue reading unlimited articles.`,
          code: 'GUEST_LIMIT_REACHED',
          limitType: 'article',
          limit: result.limit,
        });
      }
    }

    next();
  };
}
