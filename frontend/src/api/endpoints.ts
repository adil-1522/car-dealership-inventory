import { apiRequest } from './client';
import type { User, Vehicle, VehicleFilters, VehicleInput } from '../types';

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name: string, email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } }),
};

export const vehicleApi = {
  list: () => apiRequest<Vehicle[]>('/vehicles'),
  search: (filters: VehicleFilters) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    return apiRequest<Vehicle[]>(`/vehicles/search?${params}`);
  },
  create: (input: VehicleInput) => apiRequest<Vehicle>('/vehicles', { method: 'POST', body: input }),
  update: (id: number, input: Partial<VehicleInput>) =>
    apiRequest<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => apiRequest<void>(`/vehicles/${id}`, { method: 'DELETE' }),
  purchase: (id: number, quantity = 1) =>
    apiRequest<Vehicle>(`/vehicles/${id}/purchase`, { method: 'POST', body: { quantity } }),
  restock: (id: number, quantity: number) =>
    apiRequest<Vehicle>(`/vehicles/${id}/restock`, { method: 'POST', body: { quantity } }),
};
