import { loadConfig } from '../config';
import { createDatabase } from '../db/database';
import { VehicleRepository } from '../repositories/vehicleRepository';
import type { NewVehicle } from '../types';

/** Demo inventory so the UI has something to show on first run. */
const DEMO_VEHICLES: NewVehicle[] = [
  { make: 'Toyota', model: 'Camry', category: 'Sedan', price: 27500, quantity: 6, year: 2024 },
  { make: 'Honda', model: 'Civic', category: 'Sedan', price: 24000, quantity: 4, year: 2024 },
  { make: 'Tesla', model: 'Model 3', category: 'Electric', price: 40990, quantity: 3, year: 2025 },
  { make: 'Ford', model: 'F-150', category: 'Truck', price: 45500, quantity: 2, year: 2024 },
  { make: 'Jeep', model: 'Wrangler', category: 'SUV', price: 38900, quantity: 0, year: 2023 },
  { make: 'Toyota', model: 'RAV4', category: 'SUV', price: 31200, quantity: 5, year: 2025 },
  { make: 'BMW', model: '3 Series', category: 'Luxury', price: 46700, quantity: 1, year: 2024 },
  { make: 'Mazda', model: 'MX-5 Miata', category: 'Coupe', price: 29900, quantity: 2, year: 2024 },
].map((v) => ({
  ...v,
  description: `${v.year} ${v.make} ${v.model}.`,
}));

function seed(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file present.
  }
  const db = createDatabase(loadConfig().databasePath);
  const repo = new VehicleRepository(db);
  if (repo.findAll().length > 0) {
    console.log('Vehicles already present, skipping seed.');
    return;
  }
  DEMO_VEHICLES.forEach((v) => repo.create(v));
  console.log(`Seeded ${DEMO_VEHICLES.length} vehicles.`);
}

seed();
