import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

// Errors we raise on purpose. Anything else is treated as a 500.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// One place that shapes every error response: { error: { code, message } }.
// Stack traces are logged on the server, never sent to the client.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
    });
    return;
  }

  logger.error({ err, method: req.method, path: req.path }, 'unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
