import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4010;
const WEB_PORT = 5175;

// Set PLAYWRIGHT_CHROMIUM_PATH to reuse a Chromium already on the machine
// instead of the one `npx playwright install` downloads.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

/**
 * Runs the real backend and frontend, then drives them in a browser.
 * The API gets its own throwaway database so a run never touches dev data.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend run build && npm --prefix ../backend start',
      port: API_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_PATH: './e2e.db',
        JWT_SECRET: 'e2e-secret',
        ADMIN_EMAIL: 'admin@dealership.com',
        ADMIN_PASSWORD: 'Admin@123',
      },
    },
    {
      command: `npm --prefix ../frontend run dev -- --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
