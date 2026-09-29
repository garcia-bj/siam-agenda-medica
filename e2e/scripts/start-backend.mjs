// Levanta la API para los tests E2E con una base SQLite NUEVA en cada corrida (sin seed):
// así los tests no dependen de datos anteriores. Lo usa playwright.config.ts (webServer).
import { execFileSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = resolve(fileURLToPath(import.meta.url), '../../../backend');
const dbFile = join(tmpdir(), 'siam-e2e.db');
for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(dbFile + suffix, { force: true });

const env = {
  ...process.env,
  DATABASE_URL: `file:${dbFile}`,
  PORT: process.env.E2E_API_PORT ?? '3301',
  CORS_ORIGIN: `http://localhost:${process.env.E2E_WEB_PORT ?? '3300'}`,
  CLINIC_TZ: 'America/La_Paz',
};

const prismaCli = createRequire(join(backendDir, 'package.json')).resolve('prisma/build/index.js');
execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: backendDir, env, stdio: 'inherit' });

const api = spawn(process.execPath, ['dist/main.js'], { cwd: backendDir, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.kill(signal));
api.on('exit', (code) => process.exit(code ?? 0));
