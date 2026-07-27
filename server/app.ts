import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import userRoutes from './routes/userRoutes.js';

export const app = express();

// CORS configuration
//
// credentials: true means the browser will send cookies/auth headers on
// cross-origin requests, so we must never pair that with a wildcard/
// reflect-any-origin policy — that would let any website make authenticated
// requests against this API on a logged-in user's behalf.
if (config.nodeEnv === 'production' && !config.frontendOrigin) {
  throw new Error(
    '[app] FRONTEND_ORIGIN is required in production but was not set. Refusing to start.'
  );
}

const allowedOrigins = config.frontendOrigin
  ? config.frontendOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : null; // null only ever happens outside production (local dev)

app.use(
  cors({
    origin: allowedOrigins ?? true, // dev-only fallback: reflect origin
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
