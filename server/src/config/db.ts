import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

// Connects once at startup. Mongoose keeps the connection alive after that.
export async function connectDb(uri: string = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  // Build indexes up front so unique constraints (like one email per account) hold.
  await Promise.all(Object.values(mongoose.connection.models).map((m) => m.syncIndexes()));
  logger.info({ db: mongoose.connection.name }, 'connected to MongoDB');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
