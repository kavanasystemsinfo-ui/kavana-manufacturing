import { Router } from 'express';

export const productionRoutes = Router();

productionRoutes.get('/', (req, res) => {
  res.json({
    message: 'Production module ready. Incremental production recording and traceability events will be implemented here.'
  });
});
