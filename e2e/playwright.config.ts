import { defineConfig, devices } from '@playwright/test';

// Por defecto Playwright levanta la API y el front solo, en puertos propios y con una base nueva.
// Para correr contra algo ya levantado (por ejemplo docker compose):
//   E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:3001/api pnpm test:e2e
const WEB_PORT = process.env.E2E_WEB_PORT ?? '3300';
const API_PORT = process.env.E2E_API_PORT ?? '3301';
const external = Boolean(process.env.E2E_BASE_URL);

export const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${WEB_PORT}`;
export const API_URL = process.env.E2E_API_URL ?? `http://localhost:${API_PORT}/api`;

export default defineConfig({
  testDir: './tests',
  // Un solo navegador a la vez: los tests comparten la base y así se cuida la memoria de la máquina.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: external
    ? undefined
    : [
        {
          command: 'pnpm --filter backend build && node scripts/start-backend.mjs',
          url: `${API_URL}/health`,
          env: { E2E_API_PORT: API_PORT, E2E_WEB_PORT: WEB_PORT },
          reuseExistingServer: false,
          timeout: 180_000,
          stdout: 'ignore',
        },
        {
          command: `pnpm --filter frontend build && pnpm --filter frontend exec next start --port ${WEB_PORT}`,
          url: BASE_URL,
          env: { NEXT_PUBLIC_API_URL: API_URL, NEXT_PUBLIC_USE_MOCKS: 'false', NEXT_TELEMETRY_DISABLED: '1' },
          reuseExistingServer: false,
          timeout: 300_000,
          stdout: 'ignore',
        },
      ],
});
