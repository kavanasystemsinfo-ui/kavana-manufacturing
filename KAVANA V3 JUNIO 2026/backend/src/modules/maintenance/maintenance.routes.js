import { Router } from 'express';

export const maintenanceRoutes = Router();

maintenanceRoutes.get('/', (req, res) => {
  res.json({
    message: 'Maintenance module ready. Preventive maintenance and machine counters will be implemented here.'
  });
});
