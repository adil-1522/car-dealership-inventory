export interface Config {
  port: number;
  databasePath: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin?: string;
  admin?: { email: string; password: string };
}

const DEV_JWT_SECRET = 'dev-only-insecure-secret';

/** Reads configuration from environment variables, with safe defaults for local development. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && !env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }

  return {
    port: Number(env.PORT ?? 4000),
    databasePath: env.DATABASE_PATH ?? './dealership.db',
    jwtSecret: env.JWT_SECRET ?? DEV_JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '1d',
    corsOrigin: env.CORS_ORIGIN,
    admin:
      env.ADMIN_EMAIL && env.ADMIN_PASSWORD ? { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD } : undefined,
  };
}
