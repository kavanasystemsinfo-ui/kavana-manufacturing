import { Router } from 'express';

export const analyticsRoutes = Router();

analyticsRoutes.get('/', (req, res) => {
  res.json({
    message: 'Analytics module ready. KPIs, OEE and financial reports will be implemented here.'
  });
});
