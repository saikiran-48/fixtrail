import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { logger } from './config/logger.js';

// Entry point: connect to the database first, then start serving requests.
// If the database is unreachable, we stop rather than serve errors.
async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'fixtrail API listening');
  });

  // Hosts like Render send SIGTERM before restarting or redeploying.
  // Finish in-flight requests, close the database connection, then exit.
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Don't hang forever if a request never finishes.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
