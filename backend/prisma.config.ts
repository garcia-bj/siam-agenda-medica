import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no lee el .env solo. En Docker las variables vienen del compose.
if (existsSync('.env')) process.loadEnvFile();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
