import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Development-only origins (Vite dev server, tsx server, preview builds).
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
];

// Resolve the CORS allowlist.
// Production requires an explicit, comma-separated FRONTEND_ORIGIN and must not
// be "*". Misconfiguration fails fast at startup instead of opening the API.
function resolveAllowedOrigins(): string[] {
  const configured = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (config.nodeEnv === 'production') {
    if (configured.length === 0) {
      throw new Error(
        '[Config Error] NODE_ENV=production requires FRONTEND_ORIGIN to be set. Provide a comma-separated list of allowed origins.'
      );
    }
    if (configured.includes('*')) {
      throw new Error(
        '[Config Error] FRONTEND_ORIGIN must not be "*" in production. Provide an explicit comma-separated list of allowed origins.'
      );
    }
    return configured;
  }

  return [...new Set([...DEFAULT_DEV_ORIGINS, ...configured])];
}

const allowedOrigins = resolveAllowedOrigins();

export const app = express();

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// Health check endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseAI News Engine',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseAI News Engine v1',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Versioned Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/summaries', summaryRoutes);

// Centralized API Error Handler
app.use('/api', errorHandler);
