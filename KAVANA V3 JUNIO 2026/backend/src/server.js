import http from 'node:http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { connectMongo } from './db/connectMongo.js';
import { logger } from './utils/logger.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const server = http.createServer(app);

async function bootstrap() {
  await connectMongo();

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'KAVANA V3 API listening');
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Fatal bootstrap error');
  process.exit(1);
});
