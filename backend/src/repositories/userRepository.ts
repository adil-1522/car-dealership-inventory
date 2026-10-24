import type Database from 'better-sqlite3';
import type { Role, User, UserWithPassword } from '../types';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
}

function toUser(row: UserRow): UserWithPassword {
  return { id: row.id, name: row.name, email: row.email, role: row.role, passwordHash: row.password_hash };
}

/** Data access for users. Knows SQL, knows nothing about HTTP or hashing. */
export class UserRepository {
  constructor(private readonly db: Database.Database) {}

  findByEmail(email: string): UserWithPassword | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row && toUser(row);
  }

  create(input: { name: string; email: string; passwordHash: string; role: Role }): User {
    const result = this.db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(input.name, input.email, input.passwordHash, input.role);
    return { id: Number(result.lastInsertRowid), name: input.name, email: input.email, role: input.role };
  }
}
