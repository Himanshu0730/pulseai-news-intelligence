import { NextFunction, Request, Response } from 'express';

// An error whose message is deliberately authored for the client (safe to send).
// Use for intentional, user-facing failures (e.g. invalid credentials).
export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const GENERIC_SERVER_ERROR = 'An internal server error occurred';
const GENERIC_CLIENT_ERROR = 'Request could not be completed';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Log the full error server-side; never echo raw details to clients.
  console.error('[Global Express Error Handler]:', err);

  const status = err.statusCode || err.status || 500;

  // AppError messages are authored by this codebase, so they are safe to send.
  if (err instanceof AppError) {
    return res.status(status).json({
      error: err.message,
      status,
      ...(err.code ? { code: err.code } : {}),
    });
  }

  // Unknown/internal error: redact the message and any sensitive detail.
  // Preserve the HTTP status code so callers can still react appropriately.
  const message = status >= 500 ? GENERIC_SERVER_ERROR : GENERIC_CLIENT_ERROR;
  res.status(status).json({
    error: message,
    status,
    code: 'INTERNAL_ERROR',
  });
}
