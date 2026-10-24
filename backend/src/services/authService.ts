import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ConflictError, UnauthorizedError } from '../errors';
import type { UserRepository } from '../repositories/userRepository';
import type { AuthUser, Role, User, UserWithPassword } from '../types';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: User;
}

/** Registration, login and token handling. */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string = '1d',
  ) {}

  /** Public sign-up always creates a regular user; admins are seeded separately. */
  async register(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    if (this.users.findByEmail(email)) {
      throw new ConflictError('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = this.users.create({ name: input.name, email, passwordHash, role: 'user' });
    return { token: this.signToken(user), user };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = this.users.findByEmail(email.toLowerCase());
    // Same message for unknown email and wrong password to avoid leaking which accounts exist.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }
    return { token: this.signToken(user), user: toPublicUser(user) };
  }

  /** Creates the admin account if it does not exist yet. Safe to call on every startup. */
  async ensureAdmin(email: string, password: string, name = 'Administrator'): Promise<void> {
    const normalized = email.toLowerCase();
    if (this.users.findByEmail(normalized)) return;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    this.users.create({ name, email: normalized, passwordHash, role: 'admin' });
  }

  /** Verifies a JWT and returns the identity it carries. */
  verifyToken(token: string): AuthUser {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
      return { id: Number(payload.sub), role: payload.role as Role };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private signToken(user: User): string {
    return jwt.sign({ role: user.role }, this.jwtSecret, {
      subject: String(user.id),
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }
}

function toPublicUser({ passwordHash: _omit, ...user }: UserWithPassword): User {
  return user;
}
