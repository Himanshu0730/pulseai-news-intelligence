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
const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin.split(','),
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
