import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'pulse_ai_super_secret_jwt_key_2026_default',
  jwtExpiresIn: '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  newsApiKey: process.env.NEWS_API_KEY || '',
  gnewsApiKey: process.env.GNEWS_API_KEY || '',
  hfApiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  guestArticleLimit: parseInt(process.env.GUEST_ARTICLE_LIMIT || '10', 10),
  guestSearchLimit: parseInt(process.env.GUEST_SEARCH_LIMIT || '5', 10),
  guestAiLimit: parseInt(process.env.GUEST_AI_LIMIT || '3', 10),
};
