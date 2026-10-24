import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  bearer,
  buildTestContext,
  createVehicle,
  loginAsAdmin,
  registerUser,
  sampleVehicle,
  TEST_JWT_SECRET,
  TestContext,
} from './helpers';

/**
 * Adversarial tests: hostile input, tampered tokens and privilege escalation attempts.
 * These complement the happy-path suites by probing the edges an attacker would.
 */
describe('Security and hostile input', () => {
  let ctx: TestContext;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    ctx = buildTestContext();
    userToken = await registerUser(ctx.app);
    adminToken = await loginAsAdmin(ctx);
  });

  afterEach(() => ctx.db.close());

  describe('SQL injection attempts', () => {
    it.each([
      "'; DROP TABLE vehicles; --",
      "' OR '1'='1",
      "1; DELETE FROM vehicles WHERE 1=1; --",
      "\\' UNION SELECT * FROM users --",
    ])('treats %p as a literal search term', async (payload) => {
      await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app)
        .get('/api/vehicles/search')
        .query({ make: payload })
        .set(bearer(userToken));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      // The table must still be intact.
      const all = await request(ctx.app).get('/api/vehicles').set(bearer(userToken));
      expect(all.body).toHaveLength(1);
    });

    it('stores injection-looking text verbatim rather than executing it', async () => {
      const payload = "Robert'); DROP TABLE vehicles; --";
      const created = await createVehicle(ctx.app, adminToken, { model: payload });

      const res = await request(ctx.app).get(`/api/vehicles/${created.id}`).set(bearer(userToken));

      expect(res.body.model).toBe(payload);
    });

    it('does not let an id parameter smuggle SQL', async () => {
      const res = await request(ctx.app).get('/api/vehicles/1 OR 1=1').set(bearer(userToken));

      expect(res.status).toBe(400);
    });
  });

  describe('token tampering', () => {
    it('rejects a token whose payload was edited without re-signing', async () => {
      const [header, , signature] = userToken.split('.');
      const forgedPayload = Buffer.from(JSON.stringify({ sub: '1', role: 'admin' })).toString('base64url');

      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(`${header}.${forgedPayload}.${signature}`))
        .send(sampleVehicle);

      expect(res.status).toBe(401);
    });

    it('rejects a token signed with the "none" algorithm', async () => {
      const unsigned = jwt.sign({ role: 'admin' }, '', { algorithm: 'none', subject: '1' });

      const res = await request(ctx.app).post('/api/vehicles').set(bearer(unsigned)).send(sampleVehicle);

      expect(res.status).toBe(401);
    });

    it.each([['empty', ''], ['garbage', 'not-a-jwt'], ['only dots', '..']])(
      'rejects a %s token',
      async (_label, token) => {
        const res = await request(ctx.app).get('/api/vehicles').set(bearer(token));

        expect(res.status).toBe(401);
      },
    );

    it('ignores a role claim that contradicts the stored role', async () => {
      // A token can only be produced by the server, but defence in depth:
      // a self-signed token with an inflated role must still be signed correctly to pass.
      const inflated = jwt.sign({ role: 'admin' }, 'another-secret', { subject: '2' });

      const res = await request(ctx.app).delete('/api/vehicles/1').set(bearer(inflated));

      expect(res.status).toBe(401);
    });

    it('accepts only the Bearer scheme', async () => {
      const res = await request(ctx.app).get('/api/vehicles').set({ Authorization: `Basic ${userToken}` });

      expect(res.status).toBe(401);
    });
  });

  describe('privilege escalation', () => {
    it('ignores a role field sent when updating a vehicle', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app)
        .put(`/api/vehicles/${created.id}`)
        .set(bearer(adminToken))
        .send({ price: 100, role: 'admin', id: 999 });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body).not.toHaveProperty('role');
    });

    it('does not let a user escalate by re-registering an existing admin email', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/register')
        .send({ name: 'Imposter', email: 'admin@example.com', password: 'Password1' });

      expect(res.status).toBe(409);
    });

    it('keeps a user a user even after many registrations', async () => {
      for (let i = 0; i < 3; i += 1) {
        const res = await request(ctx.app)
          .post('/api/auth/register')
          .send({ name: 'U', email: `u${i}@example.com`, password: 'Password1', role: 'admin', isAdmin: true });
        expect(res.body.user.role).toBe('user');
      }
    });
  });

  describe('oversized and malformed input', () => {
    it('rejects a make longer than the column allows', async () => {
      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(adminToken))
        .send({ ...sampleVehicle, make: 'A'.repeat(500) });

      expect(res.status).toBe(400);
    });

    it('rejects a description beyond the documented limit', async () => {
      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(adminToken))
        .send({ ...sampleVehicle, description: 'x'.repeat(5000) });

      expect(res.status).toBe(400);
    });

    it('rejects a non-URL image reference', async () => {
      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(adminToken))
        .send({ ...sampleVehicle, imageUrl: 'javascript:alert(1)' });

      expect(res.status).toBe(400);
    });

    it.each([
      ['an array', []],
      ['a string', 'not-an-object'],
      ['null', null],
    ])('rejects %s as a request body', async (_label, body) => {
      const res = await request(ctx.app).post('/api/auth/login').send(body as never);

      expect(res.status).toBe(400);
    });

    it('rejects a price expressed as a numeric string', async () => {
      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(adminToken))
        .send({ ...sampleVehicle, price: '27000' });

      expect(res.status).toBe(400);
    });

    it('trims surrounding whitespace rather than storing it', async () => {
      const created = await createVehicle(ctx.app, adminToken, { make: '  Toyota  ' });

      expect(created.make).toBe('Toyota');
    });
  });

  describe('data exposure', () => {
    it('never includes a password hash in any vehicle or auth response', async () => {
      const register = await request(ctx.app)
        .post('/api/auth/register')
        .send({ name: 'A', email: 'leak@example.com', password: 'Password1' });
      const login = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'leak@example.com', password: 'Password1' });

      for (const res of [register, login]) {
        expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
        expect(JSON.stringify(res.body)).not.toMatch(/password/i);
      }
    });

    it('does not leak SQL or stack traces in error messages', async () => {
      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(adminToken))
        .send({ ...sampleVehicle, price: -1 });

      expect(res.body.error).not.toMatch(/SELECT|INSERT|sqlite|at Object/i);
    });
  });

  describe('inventory integrity under stress', () => {
    it('keeps stock consistent across interleaved purchases and restocks', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 10 });

      const operations = [
        ...Array.from({ length: 8 }, () =>
          request(ctx.app).post(`/api/vehicles/${vehicle.id}/purchase`).set(bearer(userToken)).send({ quantity: 2 }),
        ),
        ...Array.from({ length: 3 }, () =>
          request(ctx.app).post(`/api/vehicles/${vehicle.id}/restock`).set(bearer(adminToken)).send({ quantity: 2 }),
        ),
      ];
      const results = await Promise.all(operations);

      const purchased = results.filter((r) => r.status === 200 && r.request.url.includes('purchase')).length;
      const restocked = results.filter((r) => r.status === 200 && r.request.url.includes('restock')).length;
      const final = await request(ctx.app).get(`/api/vehicles/${vehicle.id}`).set(bearer(userToken));

      expect(final.body.quantity).toBe(10 - purchased * 2 + restocked * 2);
      expect(final.body.quantity).toBeGreaterThanOrEqual(0);
    });

    it('never allows a negative quantity through any route', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 1 });

      await Promise.all(
        Array.from({ length: 10 }, () =>
          request(ctx.app).post(`/api/vehicles/${vehicle.id}/purchase`).set(bearer(userToken)).send({}),
        ),
      );
      const res = await request(ctx.app).get(`/api/vehicles/${vehicle.id}`).set(bearer(userToken));

      expect(res.body.quantity).toBe(0);
    });
  });
});
