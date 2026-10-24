import { Router } from 'express';
import { parseOrThrow } from '../middleware/validate';
import type { AuthService } from '../services/authService';
import { loginSchema, registerSchema } from '../validation/schemas';

export function authRoutes(authService: AuthService): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const input = parseOrThrow(registerSchema, req.body);
    res.status(201).json(await authService.register(input));
  });

  router.post('/login', async (req, res) => {
    const { email, password } = parseOrThrow(loginSchema, req.body);
    res.json(await authService.login(email, password));
  });

  return router;
}
