import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { routes } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';

export const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'kavana-v3-api',
    version: '3.0.0-alpha',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    message: `No route found for ${req.method} ${req.originalUrl}`
  });
});

app.use(errorHandler);
