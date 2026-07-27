import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { config } from '../config.js';
import { AuthenticatedRequest } from './authMiddleware.js';
import { guestService } from '../services/guestService.js';

function getGuestFingerprint(req: AuthenticatedRequest): string {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256').update(`${ip}::${ua}::${config.guestSalt}`).digest('hex').slice(0, 16);
}

export function enforceGuestLimit(actionType: 'article' | 'search' | 'ai') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Authenticated users bypass guest limits
    if (req.user) {
      return next();
    }

    // Server-side fingerprint for enforcement; client x-guest-id is ignored for limits
    const guestId = getGuestFingerprint(req);

    // TODO: Migrate guestService to use 24h sliding window instead of calendar-day reset
    if (actionType === 'search') {
      const result = guestService.checkAndIncrementSearch(guestId);
      if (!result.allowed) {
        res.setHeader('Retry-After', '3600');
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
        res.setHeader('Retry-After', '3600');
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
        res.setHeader('Retry-After', '3600');
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
