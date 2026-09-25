-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_specialty_startTime_idx" ON "Appointment"("specialty", "startTime");

-- Antioverbooking: una sola cita ACTIVE por especialidad y hora.
-- Prisma no genera índices parciales, por eso se agrega a mano.
CREATE UNIQUE INDEX "appointment_active_slot_unique" ON "Appointment"("specialty", "startTime") WHERE "status" = 'ACTIVE';
