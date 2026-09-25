import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // timeout = busy_timeout de SQLite: una escritura espera su turno en vez de fallar con "database is locked".
    super({ adapter: new PrismaBetterSqlite3({ url: databaseUrl(), timeout: 5000 }) });
  }

  async onModuleInit() {
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL en el entorno');
  return url;
}
