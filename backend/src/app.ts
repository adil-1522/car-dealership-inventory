import cors from 'cors';
import express, { Express } from 'express';
import type Database from 'better-sqlite3';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { UserRepository } from './repositories/userRepository';
import { authRoutes } from './routes/authRoutes';
import { AuthService } from './services/authService';

export interface AppOptions {
  db: Database.Database;
  jwtSecret: string;
  jwtExpiresIn?: string;
  corsOrigin?: string;
}

/**
 * Composition root: wires repositories, services and routes together.
 * Dependencies are injected so tests can supply an isolated database.
 */
export function createApp({ db, jwtSecret, jwtExpiresIn, corsOrigin }: AppOptions): Express {
  const authService = new AuthService(new UserRepository(db), jwtSecret, jwtExpiresIn);

  const app = express();
  app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', authRoutes(authService));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
