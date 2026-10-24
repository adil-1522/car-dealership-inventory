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
