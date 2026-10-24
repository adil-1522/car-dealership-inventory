import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  bearer,
  buildTestContext,
  createVehicle,
  loginAsAdmin,
  registerUser,
  sampleVehicle,
  TestContext,
} from './helpers';

describe('Vehicles API', () => {
  let ctx: TestContext;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    ctx = buildTestContext();
    userToken = await registerUser(ctx.app);
    adminToken = await loginAsAdmin(ctx);
  });

  afterEach(() => ctx.db.close());

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      const res = await request(ctx.app).get('/api/vehicles');

      expect(res.status).toBe(401);
    });

    it('rejects a token that is not a Bearer token', async () => {
      const res = await request(ctx.app).get('/api/vehicles').set('Authorization', userToken);

      expect(res.status).toBe(401);
    });

    it('rejects a token signed with a different secret', async () => {
      const forged = jwt.sign({ role: 'admin' }, 'wrong-secret', { subject: '1' });
      const res = await request(ctx.app).get('/api/vehicles').set(bearer(forged));

      expect(res.status).toBe(401);
    });

    it('rejects an expired token', async () => {
      const expired = jwt.sign({ role: 'user' }, 'test-secret', { subject: '1', expiresIn: -10 });
      const res = await request(ctx.app).get('/api/vehicles').set(bearer(expired));

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/vehicles', () => {
    it('lets an admin add a vehicle and returns it with an id', async () => {
      const res = await request(ctx.app)
        .post('/api/vehicles')
        .set(bearer(adminToken))
        .send({ ...sampleVehicle, year: 2024, description: 'Reliable family sedan' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(Number),
        ...sampleVehicle,
        year: 2024,
        description: 'Reliable family sedan',
      });
    });

    it('forbids regular users from adding vehicles', async () => {
      const res = await request(ctx.app).post('/api/vehicles').set(bearer(userToken)).send(sampleVehicle);

      expect(res.status).toBe(403);
    });

    it.each([
      ['missing make', { ...sampleVehicle, make: undefined }],
      ['blank model', { ...sampleVehicle, model: '   ' }],
      ['negative price', { ...sampleVehicle, price: -1 }],
      ['non-numeric price', { ...sampleVehicle, price: 'cheap' }],
      ['fractional quantity', { ...sampleVehicle, quantity: 1.5 }],
      ['negative quantity', { ...sampleVehicle, quantity: -3 }],
    ])('rejects %s with 400', async (_label, body) => {
      const res = await request(ctx.app).post('/api/vehicles').set(bearer(adminToken)).send(body);

      expect(res.status).toBe(400);
    });

    it('defaults quantity to 0 when omitted', async () => {
      const { quantity: _q, ...withoutQuantity } = sampleVehicle;
      const res = await request(ctx.app).post('/api/vehicles').set(bearer(adminToken)).send(withoutQuantity);

      expect(res.status).toBe(201);
      expect(res.body.quantity).toBe(0);
    });
  });

  describe('GET /api/vehicles', () => {
    it('returns an empty list when there is no inventory', async () => {
      const res = await request(ctx.app).get('/api/vehicles').set(bearer(userToken));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns every vehicle to any authenticated user, including sold-out ones', async () => {
      await createVehicle(ctx.app, adminToken);
      await createVehicle(ctx.app, adminToken, { make: 'Honda', model: 'Civic', quantity: 0 });

      const res = await request(ctx.app).get('/api/vehicles').set(bearer(userToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((v: { model: string }) => v.model).sort()).toEqual(['Camry', 'Civic']);
    });
  });

  describe('GET /api/vehicles/:id', () => {
    it('returns a single vehicle', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).get(`/api/vehicles/${created.id}`).set(bearer(userToken));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(created);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(ctx.app).get('/api/vehicles/999').set(bearer(userToken));

      expect(res.status).toBe(404);
    });

    it('returns 400 for a non-numeric id', async () => {
      const res = await request(ctx.app).get('/api/vehicles/abc').set(bearer(userToken));

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/vehicles/search', () => {
    beforeEach(async () => {
      await createVehicle(ctx.app, adminToken, { make: 'Toyota', model: 'Camry', category: 'Sedan', price: 27000 });
      await createVehicle(ctx.app, adminToken, { make: 'Toyota', model: 'RAV4', category: 'SUV', price: 31000 });
      await createVehicle(ctx.app, adminToken, { make: 'Ford', model: 'F-150', category: 'Truck', price: 45000 });
      await createVehicle(ctx.app, adminToken, { make: 'Tesla', model: 'Model 3', category: 'Sedan', price: 40000 });
    });

    const search = (query: Record<string, string | number>) =>
      request(ctx.app).get('/api/vehicles/search').query(query).set(bearer(userToken));

    const models = (body: Array<{ model: string }>) => body.map((v) => v.model).sort();

    it('filters by make, case-insensitively', async () => {
      const res = await search({ make: 'toyota' });

      expect(res.status).toBe(200);
      expect(models(res.body)).toEqual(['Camry', 'RAV4']);
    });

    it('matches model by partial text', async () => {
      const res = await search({ model: 'model' });

      expect(models(res.body)).toEqual(['Model 3']);
    });

    it('filters by category', async () => {
      const res = await search({ category: 'sedan' });

      expect(models(res.body)).toEqual(['Camry', 'Model 3']);
    });

    it('filters by an inclusive price range', async () => {
      const res = await search({ minPrice: 31000, maxPrice: 40000 });

      expect(models(res.body)).toEqual(['Model 3', 'RAV4']);
    });

    it('supports only a minimum or only a maximum price', async () => {
      expect(models((await search({ minPrice: 40000 })).body)).toEqual(['F-150', 'Model 3']);
      expect(models((await search({ maxPrice: 27000 })).body)).toEqual(['Camry']);
    });

    it('combines filters with AND semantics', async () => {
      const res = await search({ make: 'toyota', category: 'suv', maxPrice: 50000 });

      expect(models(res.body)).toEqual(['RAV4']);
    });

    it('returns everything when no filters are given', async () => {
      const res = await search({});

      expect(res.body).toHaveLength(4);
    });

    it('treats SQL wildcard characters literally', async () => {
      const res = await search({ make: '%' });

      expect(res.body).toEqual([]);
    });

    it('rejects a non-numeric price with 400', async () => {
      const res = await search({ minPrice: 'abc' });

      expect(res.status).toBe(400);
    });

    it('rejects minPrice greater than maxPrice with 400', async () => {
      const res = await search({ minPrice: 50000, maxPrice: 10000 });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/vehicles/:id', () => {
    it('lets an admin update some fields and keeps the rest', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app)
        .put(`/api/vehicles/${created.id}`)
        .set(bearer(adminToken))
        .send({ price: 25500, model: 'Camry SE' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ...created, price: 25500, model: 'Camry SE' });
    });

    it('persists the update', async () => {
      const created = await createVehicle(ctx.app, adminToken);
      await request(ctx.app).put(`/api/vehicles/${created.id}`).set(bearer(adminToken)).send({ price: 1 });

      const res = await request(ctx.app).get(`/api/vehicles/${created.id}`).set(bearer(userToken));

      expect(res.body.price).toBe(1);
    });

    it('forbids regular users from updating', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).put(`/api/vehicles/${created.id}`).set(bearer(userToken)).send({ price: 1 });

      expect(res.status).toBe(403);
    });

    it('rejects invalid values with 400', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).put(`/api/vehicles/${created.id}`).set(bearer(adminToken)).send({ price: -5 });

      expect(res.status).toBe(400);
    });

    it('rejects an empty update with 400', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).put(`/api/vehicles/${created.id}`).set(bearer(adminToken)).send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown vehicle', async () => {
      const res = await request(ctx.app).put('/api/vehicles/999').set(bearer(adminToken)).send({ price: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    it('lets an admin delete a vehicle', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).delete(`/api/vehicles/${created.id}`).set(bearer(adminToken));
      const after = await request(ctx.app).get(`/api/vehicles/${created.id}`).set(bearer(adminToken));

      expect(res.status).toBe(204);
      expect(after.status).toBe(404);
    });

    it('forbids regular users from deleting', async () => {
      const created = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).delete(`/api/vehicles/${created.id}`).set(bearer(userToken));

      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown vehicle', async () => {
      const res = await request(ctx.app).delete('/api/vehicles/999').set(bearer(adminToken));

      expect(res.status).toBe(404);
    });
  });
});
