import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, AppError } from './middleware/error.js';
import { authRouter } from './modules/auth/routes.js';
import { ticketsRouter } from './modules/tickets/routes.js';

// The built React app lives at <repo>/client/dist. This file runs from
// server/src (dev) or server/dist (prod), and both are two levels below the repo root.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

// The Express app, with no listen() and no database connection of its own.
// Tests import this directly and never open a port.
export function createApp() {
  const app = express();

  if (env.NODE_ENV === 'production') {
    // Behind the hosting platform's proxy, so cookies and client IPs are read correctly.
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true, // the httpOnly session cookie must be sent
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/tickets', ticketsRouter);

  // In production, one server serves both the API and the web app, so the
  // browser sees a single origin. Any non-API path returns the React app.
  if (env.NODE_ENV === 'production') {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Unknown API routes get the same error shape as everything else.
  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  app.use(errorHandler);

  return app;
}
