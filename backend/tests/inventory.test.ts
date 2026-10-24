import request from 'supertest';
import { buildTestContext, createVehicle, loginAsAdmin, registerUser, TestContext } from './helpers';

describe('Inventory API', () => {
  let ctx: TestContext;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    ctx = buildTestContext();
    userToken = await registerUser(ctx.app);
    adminToken = await loginAsAdmin(ctx);
  });

  afterEach(() => ctx.db.close());

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('POST /api/vehicles/:id/purchase', () => {
    const purchase = (id: number, body: object = {}, token = userToken) =>
      request(ctx.app).post(`/api/vehicles/${id}/purchase`).set(auth(token)).send(body);

    it('decreases the quantity by one by default', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 3 });

      const res = await purchase(vehicle.id);

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(2);
    });

    it('decreases the quantity by the requested amount', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 5 });

      const res = await purchase(vehicle.id, { quantity: 3 });

      expect(res.body.quantity).toBe(2);
    });

    it('persists the new stock level', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 2 });
      await purchase(vehicle.id);

      const res = await request(ctx.app).get(`/api/vehicles/${vehicle.id}`).set(auth(userToken));

      expect(res.body.quantity).toBe(1);
    });

    it('allows buying the last unit', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 1 });

      const res = await purchase(vehicle.id);

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(0);
    });

    it('rejects a purchase when the vehicle is out of stock', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 0 });

      const res = await purchase(vehicle.id);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/stock/i);
    });

    it('rejects buying more than is in stock and leaves stock unchanged', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 2 });

      const res = await purchase(vehicle.id, { quantity: 3 });
      const after = await request(ctx.app).get(`/api/vehicles/${vehicle.id}`).set(auth(userToken));

      expect(res.status).toBe(409);
      expect(after.body.quantity).toBe(2);
    });

    it('never oversells under concurrent purchases', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 3 });

      const results = await Promise.all(Array.from({ length: 6 }, () => purchase(vehicle.id)));
      const succeeded = results.filter((r) => r.status === 200).length;
      const after = await request(ctx.app).get(`/api/vehicles/${vehicle.id}`).set(auth(userToken));

      expect(succeeded).toBe(3);
      expect(after.body.quantity).toBe(0);
    });

    it.each([[0], [-1], [1.5], ['two']])('rejects quantity %p with 400', async (quantity) => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 5 });

      const res = await purchase(vehicle.id, { quantity });

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown vehicle', async () => {
      const res = await purchase(999);

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken);

      const res = await request(ctx.app).post(`/api/vehicles/${vehicle.id}/purchase`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/vehicles/:id/restock', () => {
    const restock = (id: number, body: object, token = adminToken) =>
      request(ctx.app).post(`/api/vehicles/${id}/restock`).set(auth(token)).send(body);

    it('lets an admin increase the quantity', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 1 });

      const res = await restock(vehicle.id, { quantity: 4 });

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(5);
    });

    it('brings a sold-out vehicle back in stock', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken, { quantity: 0 });

      await restock(vehicle.id, { quantity: 2 });
      const res = await request(ctx.app).post(`/api/vehicles/${vehicle.id}/purchase`).set(auth(userToken));

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(1);
    });

    it('forbids regular users from restocking', async () => {
      const vehicle = await createVehicle(ctx.app, adminToken);

      const res = await restock(vehicle.id, { quantity: 4 }, userToken);

      expect(res.status).toBe(403);
    });

    it.each([[undefined], [0], [-2], [2.5]])('rejects quantity %p with 400', async (quantity) => {
      const vehicle = await createVehicle(ctx.app, adminToken);

      const res = await restock(vehicle.id, { quantity });

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown vehicle', async () => {
      const res = await restock(999, { quantity: 1 });

      expect(res.status).toBe(404);
    });
  });
});
