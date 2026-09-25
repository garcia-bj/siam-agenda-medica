import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// Base SQLite propia de los e2e (no toca siam.db). global-setup le aplica las migraciones.
process.env.DATABASE_URL = `file:${join(tmpdir(), `siam-e2e-${process.pid}.db`)}`;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
  },
});
