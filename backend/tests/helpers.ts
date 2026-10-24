import request from 'supertest';
import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/database';
import { UserRepository } from '../src/repositories/userRepository';
import { AuthService } from '../src/services/authService';

export const TEST_JWT_SECRET = 'test-secret';

export interface TestContext {
  app: Express;
  db: Database.Database;
}

/** Builds a fresh app backed by its own isolated SQLite database. */
export function buildTestContext(): TestContext {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: TEST_JWT_SECRET });
  return { app, db };
}

/** Registers a regular user and returns their JWT. */
export async function registerUser(
  app: Express,
  email = 'buyer@example.com',
  password = 'Password123',
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test Buyer', email, password });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

/** Seeds an admin directly in the database and returns their JWT. */
export async function loginAsAdmin(ctx: TestContext): Promise<string> {
  const authService = new AuthService(new UserRepository(ctx.db), TEST_JWT_SECRET);
  await authService.ensureAdmin('admin@example.com', 'AdminPass123');
  const res = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'AdminPass123' });
  return res.body.token;
}
