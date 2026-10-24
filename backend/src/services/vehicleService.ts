import { NotFoundError, ValidationError } from '../errors';
import type { VehicleRepository } from '../repositories/vehicleRepository';
import type { NewVehicle, Vehicle, VehicleFilters, VehicleUpdate } from '../types';

/** Business rules for the vehicle catalogue. */
export class VehicleService {
  constructor(private readonly vehicles: VehicleRepository) {}

  list(): Vehicle[] {
    return this.vehicles.findAll();
  }

  get(id: number): Vehicle {
    const vehicle = this.vehicles.findById(id);
    if (!vehicle) throw new NotFoundError(`Vehicle ${id} not found`);
    return vehicle;
  }

  search(filters: VehicleFilters): Vehicle[] {
    const { minPrice, maxPrice } = filters;
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new ValidationError('minPrice cannot be greater than maxPrice');
    }
    return this.vehicles.search(filters);
  }

  create(input: NewVehicle): Vehicle {
    return this.vehicles.create(input);
  }

  update(id: number, changes: VehicleUpdate): Vehicle {
    const vehicle = this.vehicles.update(id, changes);
    if (!vehicle) throw new NotFoundError(`Vehicle ${id} not found`);
    return vehicle;
  }

  remove(id: number): void {
    if (!this.vehicles.delete(id)) throw new NotFoundError(`Vehicle ${id} not found`);
  }
}
