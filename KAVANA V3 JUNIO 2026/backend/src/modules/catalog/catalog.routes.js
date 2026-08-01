import { Router } from 'express';

export const catalogRoutes = Router();

catalogRoutes.get('/', (req, res) => {
  res.json({
    message: 'Catalog module ready. Materials, products, manufacturing models and BOMs will be implemented here.'
  });
});
