import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'kavana-v3-api',
    version: '3.0.0-alpha',
    uptime: process.uptime()
  });
});
