import request from 'supertest';
import jwt from 'jsonwebtoken';
import { buildTestContext, TestContext, TEST_JWT_SECRET } from './helpers';

describe('Auth API', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = buildTestContext();
  });

  afterEach(() => ctx.db.close());

  describe('POST /api/auth/register', () => {
    const validUser = { name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123' };

    it('creates a user and returns a token plus the public user profile', async () => {
      const res = await request(ctx.app).post('/api/auth/register').send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toEqual({
        id: expect.any(Number),
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'user',
      });
    });

    it('never exposes the password hash', async () => {
      const res = await request(ctx.app).post('/api/auth/register').send(validUser);

      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('stores the password hashed, not in plain text', async () => {
      await request(ctx.app).post('/api/auth/register').send(validUser);

      const row = ctx.db.prepare('SELECT password_hash FROM users WHERE email = ?').get(validUser.email) as {
        password_hash: string;
      };
      expect(row.password_hash).not.toBe(validUser.password);
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    });

    it('treats emails case-insensitively', async () => {
      await request(ctx.app).post('/api/auth/register').send(validUser);
      const res = await request(ctx.app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'JANE@Example.com' });

      expect(res.status).toBe(409);
    });

    it('rejects a duplicate email with 409', async () => {
      await request(ctx.app).post('/api/auth/register').send(validUser);
      const res = await request(ctx.app).post('/api/auth/register').send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('cannot be used to self-assign the admin role', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/register')
        .send({ ...validUser, role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');
    });

    it.each([
      ['missing name', { email: 'a@b.com', password: 'Secret123' }],
      ['invalid email', { name: 'A', email: 'not-an-email', password: 'Secret123' }],
      ['short password', { name: 'A', email: 'a@b.com', password: '123' }],
    ])('rejects %s with 400', async (_label, body) => {
      const res = await request(ctx.app).post('/api/auth/register').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual(expect.any(String));
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(ctx.app)
        .post('/api/auth/register')
        .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123' });
    });

    it('returns a signed JWT carrying the user id and role', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'jane@example.com', password: 'Secret123' });

      expect(res.status).toBe(200);
      const payload = jwt.verify(res.body.token, TEST_JWT_SECRET) as jwt.JwtPayload;
      expect(payload.sub).toBe(String(res.body.user.id));
      expect(payload.role).toBe('user');
    });

    it('rejects a wrong password with 401', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'jane@example.com', password: 'WrongPass1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it('rejects an unknown email with the same 401 message', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Secret123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it('rejects a malformed body with 400', async () => {
      const res = await request(ctx.app).post('/api/auth/login').send({ email: 'jane@example.com' });

      expect(res.status).toBe(400);
    });
  });
});
