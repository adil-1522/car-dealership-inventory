import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import { parseOrThrow } from '../middleware/validate';
import type { VehicleService } from '../services/vehicleService';
import {
  createVehicleSchema,
  idParamSchema,
  purchaseSchema,
  restockSchema,
  searchSchema,
  updateVehicleSchema,
} from '../validation/schemas';

/** Vehicle catalogue routes. Expects to be mounted behind `authenticate`. */
export function vehicleRoutes(vehicleService: VehicleService): Router {
  const router = Router();
  const adminOnly = requireRole('admin');

  router.get('/', (_req, res) => {
    res.json(vehicleService.list());
  });

  // Registered before '/:id' so "search" is not parsed as an id.
  router.get('/search', (req, res) => {
    res.json(vehicleService.search(parseOrThrow(searchSchema, req.query)));
  });

  router.get('/:id', (req, res) => {
    res.json(vehicleService.get(parseOrThrow(idParamSchema, req.params.id)));
  });

  router.post('/', adminOnly, (req, res) => {
    res.status(201).json(vehicleService.create(parseOrThrow(createVehicleSchema, req.body)));
  });

  router.put('/:id', adminOnly, (req, res) => {
    const id = parseOrThrow(idParamSchema, req.params.id);
    res.json(vehicleService.update(id, parseOrThrow(updateVehicleSchema, req.body)));
  });

  router.delete('/:id', adminOnly, (req, res) => {
    vehicleService.remove(parseOrThrow(idParamSchema, req.params.id));
    res.status(204).end();
  });

  router.post('/:id/purchase', (req, res) => {
    const id = parseOrThrow(idParamSchema, req.params.id);
    const { quantity } = parseOrThrow(purchaseSchema, req.body ?? {});
    res.json(vehicleService.purchase(id, quantity));
  });

  router.post('/:id/restock', adminOnly, (req, res) => {
    const id = parseOrThrow(idParamSchema, req.params.id);
    const { quantity } = parseOrThrow(restockSchema, req.body ?? {});
    res.json(vehicleService.restock(id, quantity));
  });

  return router;
}
