import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { app } from './server/app.js';
import { config } from './server/config.js';
import { newsService } from './server/providers/NewsService.js';

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const host = process.env.HOST || '0.0.0.0';
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;

  app.listen(config.port, host, () => {
    console.log(`🚀 PulseAI Server running on http://${displayHost}:${config.port}`);
    // Warm default-scope caches in the background so the first request after boot
    // is served from cache instead of paying the full RSS/API aggregation cost.
    setTimeout(() => {
      newsService.warmUpCaches();
    }, 250);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting PulseAI server:', err);
  process.exit(1);
});
