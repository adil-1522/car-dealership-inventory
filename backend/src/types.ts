export type Role = 'user' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

/** Identity attached to an authenticated request. */
export interface AuthUser {
  id: number;
  role: Role;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year: number | null;
  imageUrl: string | null;
  description: string | null;
}

export type NewVehicle = Omit<Vehicle, 'id' | 'year' | 'imageUrl' | 'description'> &
  Partial<Pick<Vehicle, 'year' | 'imageUrl' | 'description'>>;

export type VehicleUpdate = Partial<Omit<Vehicle, 'id'>>;

export interface VehicleFilters {
  make?: string;
  model?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}
