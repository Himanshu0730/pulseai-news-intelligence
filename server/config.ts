import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// JWT_SECRET must always come from the environment. In production there is
// no fallback: a missing secret means anyone could forge auth tokens, so we
// fail fast at startup instead of silently signing with a known default.
// In development we generate a random per-process secret so local auth still
// works, but it changes on every restart (which is fine for local dev).
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  if (nodeEnv === 'production') {
    throw new Error(
      '[config] JWT_SECRET is required in production but was not set. Refusing to start.'
    );
  }
  console.warn(
    '[config] JWT_SECRET not set — using a random development-only secret. ' +
      'Existing tokens will be invalidated on restart. Set JWT_SECRET in .env to avoid this.'
  );
  return crypto.randomBytes(32).toString('hex');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  newsApiKey: process.env.NEWS_API_KEY || '',
  gnewsApiKey: process.env.GNEWS_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv,
  frontendOrigin: process.env.FRONTEND_ORIGIN || '',
  guestArticleLimit: parseInt(process.env.GUEST_ARTICLE_LIMIT || '10', 10),
  guestSearchLimit: parseInt(process.env.GUEST_SEARCH_LIMIT || '5', 10),
  guestAiLimit: parseInt(process.env.GUEST_AI_LIMIT || '3', 10),
};
