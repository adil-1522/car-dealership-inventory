import type Database from 'better-sqlite3';
import type { NewVehicle, Vehicle, VehicleFilters, VehicleUpdate } from '../types';

interface VehicleRow {
  id: number;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year: number | null;
  image_url: string | null;
  description: string | null;
}

/** Maps API field names to their database columns. Doubles as an allow-list for updates. */
const COLUMNS: Record<keyof VehicleUpdate, string> = {
  make: 'make',
  model: 'model',
  category: 'category',
  price: 'price',
  quantity: 'quantity',
  year: 'year',
  imageUrl: 'image_url',
  description: 'description',
};

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    category: row.category,
    price: row.price,
    quantity: row.quantity,
    year: row.year,
    imageUrl: row.image_url,
    description: row.description,
  };
}

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export class VehicleRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(): Vehicle[] {
    const rows = this.db.prepare('SELECT * FROM vehicles ORDER BY id').all() as VehicleRow[];
    return rows.map(toVehicle);
  }

  findById(id: number): Vehicle | undefined {
    const row = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as VehicleRow | undefined;
    return row && toVehicle(row);
  }

  search(filters: VehicleFilters): Vehicle[] {
    const clauses: string[] = [];
    const params: unknown[] = [];

    for (const field of ['make', 'model', 'category'] as const) {
      const value = filters[field];
      if (value) {
        // SQLite's LIKE is case-insensitive for ASCII by default.
        clauses.push(`${field} LIKE ? ESCAPE '\\'`);
        params.push(likePattern(value));
      }
    }
    if (filters.minPrice !== undefined) {
      clauses.push('price >= ?');
      params.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      clauses.push('price <= ?');
      params.push(filters.maxPrice);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT * FROM vehicles ${where} ORDER BY id`).all(...params) as VehicleRow[];
    return rows.map(toVehicle);
  }

  create(input: NewVehicle): Vehicle {
    const result = this.db
      .prepare(
        `INSERT INTO vehicles (make, model, category, price, quantity, year, image_url, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.make,
        input.model,
        input.category,
        input.price,
        input.quantity,
        input.year ?? null,
        input.imageUrl ?? null,
        input.description ?? null,
      );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  /** Applies a partial update. Returns undefined when the vehicle does not exist. */
  update(id: number, changes: VehicleUpdate): Vehicle | undefined {
    const entries = Object.entries(changes).filter(([key, value]) => key in COLUMNS && value !== undefined);
    if (entries.length > 0) {
      const assignments = entries.map(([key]) => `${COLUMNS[key as keyof VehicleUpdate]} = ?`);
      this.db
        .prepare(`UPDATE vehicles SET ${assignments.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
        .run(...entries.map(([, value]) => value), id);
    }
    return this.findById(id);
  }

  delete(id: number): boolean {
    return this.db.prepare('DELETE FROM vehicles WHERE id = ?').run(id).changes > 0;
  }
}
