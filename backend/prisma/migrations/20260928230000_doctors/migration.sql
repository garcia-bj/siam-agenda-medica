-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Doctor_specialty_idx" ON "Doctor"("specialty");

-- Un solo médico ACTIVO por especialidad. Prisma no genera índices parciales, por eso se agrega a mano.
CREATE UNIQUE INDEX "doctor_active_specialty_unique" ON "Doctor"("specialty") WHERE "active" = 1;

-- Médicos iniciales, uno por especialidad. Van en la migración (no solo en el seed)
-- para que también los tengan las bases que ya existían, donde el seed no vuelve a correr.
INSERT INTO "Doctor" ("id", "name", "specialty", "active", "updatedAt") VALUES
    ('3f1c2a10-0001-4000-8000-000000000001', 'Dr. Martín Gutiérrez', 'MEDICINA_GENERAL', true, CURRENT_TIMESTAMP),
    ('3f1c2a10-0002-4000-8000-000000000002', 'Dra. Sofía Arce', 'PEDIATRIA', true, CURRENT_TIMESTAMP),
    ('3f1c2a10-0003-4000-8000-000000000003', 'Dr. Ricardo Salazar', 'CARDIOLOGIA', true, CURRENT_TIMESTAMP),
    ('3f1c2a10-0004-4000-8000-000000000004', 'Dra. Camila Vega', 'DERMATOLOGIA', true, CURRENT_TIMESTAMP);
