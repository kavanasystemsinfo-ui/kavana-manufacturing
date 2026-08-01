import { Router } from 'express';

export const authRoutes = Router();

authRoutes.get('/', (req, res) => {
  res.json({
    message: 'Auth module ready. Login, session keepalive and token revocation will be implemented next.'
  });
});
