import { Router } from 'express';

export const inventoryRoutes = Router();

inventoryRoutes.get('/', (req, res) => {
  res.json({
    message: 'Inventory module ready. FIFO stock, lot reception and coil scanning will be implemented here.'
  });
});
