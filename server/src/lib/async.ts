import type { NextFunction, Request, Response } from 'express';

// Express 4 does not catch errors thrown in async handlers. This passes them
// to the error handler so every failure gets the same response shape.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
