import { Router } from 'express';

export const qualityRoutes = Router();

qualityRoutes.get('/', (req, res) => {
  res.json({
    message: 'Quality module ready. Inspection plans, quality records and evidence attachments will be implemented here.'
  });
});
