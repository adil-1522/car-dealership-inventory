import request from 'supertest';
import { loadConfig } from '../src/config';
import { buildTestContext, TestContext } from './helpers';

describe('App infrastructure', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = buildTestContext();
  });

  afterEach(() => ctx.db.close());

  it('exposes a public health check', async () => {
    const res = await request(ctx.app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(ctx.app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 for malformed JSON bodies', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/malformed json/i);
  });

  it('hides internal error details behind a generic 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    ctx.db.exec('DROP TABLE users');

    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'Secret123' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('loadConfig', () => {
  it('uses sensible defaults outside production', () => {
    const config = loadConfig({ NODE_ENV: 'development' });

    expect(config.port).toBe(4000);
    expect(config.databasePath).toBe('./dealership.db');
    expect(config.jwtSecret).toEqual(expect.any(String));
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      PORT: '5000',
      DATABASE_PATH: '/tmp/x.db',
      JWT_SECRET: 's3cret',
      ADMIN_EMAIL: 'boss@example.com',
      ADMIN_PASSWORD: 'Boss1234',
    });

    expect(config).toMatchObject({
      port: 5000,
      databasePath: '/tmp/x.db',
      jwtSecret: 's3cret',
      admin: { email: 'boss@example.com', password: 'Boss1234' },
    });
  });

  it('refuses to start in production without a JWT secret', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });
});
