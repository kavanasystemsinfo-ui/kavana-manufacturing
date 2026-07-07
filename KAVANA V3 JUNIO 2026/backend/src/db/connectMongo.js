import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function connectMongo() {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  try {
    await mongoose.connect(env.mongoUri);
    logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
  } catch (error) {
    logger.error({ error }, 'MongoDB connection failed');
    throw error;
  }
}
