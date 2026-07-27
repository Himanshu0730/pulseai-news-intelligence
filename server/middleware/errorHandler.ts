import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Global Express Error Handler]:', err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'An internal server error occurred';

  res.status(status).json({
    error: message,
    status,
  });
}
