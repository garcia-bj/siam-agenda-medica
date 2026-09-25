import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it('falla con un mensaje claro si falta DATABASE_URL', () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService()).toThrow('Falta DATABASE_URL en el entorno');
  });

  it('se crea sin conectarse cuando DATABASE_URL existe', () => {
    process.env.DATABASE_URL = 'file:./no-se-abre.db';

    expect(() => new PrismaService()).not.toThrow();
  });
});
