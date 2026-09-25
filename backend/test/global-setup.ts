import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const dbFile = () => process.env.DATABASE_URL!.replace(/^file:/, '');

export function setup() {
  const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { stdio: 'ignore' });
}

export function teardown() {
  for (const suffix of ['', '-wal', '-shm']) rmSync(dbFile() + suffix, { force: true });
}
