import { Router } from 'express';

export const orderRoutes = Router();

orderRoutes.get('/', (req, res) => {
  res.json({
    message: 'Order module ready. Order creation, cascade flow and lifecycle will be implemented here.'
  });
});
