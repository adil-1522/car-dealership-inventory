import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase } from './db/database';
import { UserRepository } from './repositories/userRepository';
import { AuthService } from './services/authService';

async function main(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the real environment.
  }
  const config = loadConfig();
  const db = createDatabase(config.databasePath);

  if (config.admin) {
    const authService = new AuthService(new UserRepository(db), config.jwtSecret, config.jwtExpiresIn);
    await authService.ensureAdmin(config.admin.email, config.admin.password);
  }

  const app = createApp({
    db,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    corsOrigin: config.corsOrigin,
  });
  app.listen(config.port, () => {
    console.log(`Car Dealership API listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
