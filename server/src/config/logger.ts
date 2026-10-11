import pino from 'pino';
import { env } from './env.js';

// Structured JSON logs. Never log secrets such as passwords, tokens or cookies.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
});
