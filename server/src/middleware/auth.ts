import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import type { Role } from '@fixtrail/shared';
import { env } from '../config/env.js';
import { AppError } from './error.js';
import { User } from '../models/user.js';

export const SESSION_COOKIE = 'ft_session';

export interface AuthUser {
  id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signSession(userId: Types.ObjectId): string {
  return jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, // page scripts can't read it
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Loads the logged-in user from the cookie. Role is read from the database on
// every request, so a role change takes effect immediately.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');

    let payload: { sub: string };
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'Your session has expired. Please log in again');
    }

    const user = await User.findById(payload.sub).lean();
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this'));
    }
    next();
  };
}
