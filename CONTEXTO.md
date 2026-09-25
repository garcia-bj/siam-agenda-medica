# SIAM – Contexto del proyecto

> Documento vivo. Es la fuente de contexto del proyecto para el equipo (y para cualquier asistente de código que usen).
> Si cambia una decisión, se actualiza aquí en un PR propio.

| Recurso | Enlace |
| --- | --- |
| Repositorio | https://github.com/garcia-bj/siam-agenda-medica |
| Tablero Trello | https://trello.com/b/zHXLJoHG/siam-agenda-m%C3%A9dica |
| Plan de trabajo | https://claude.ai/code/artifact/9f5c21fd-d806-48c7-8252-3237f507c48a |
| Mockups | https://claude.ai/artifact/NvCGQnsF9mETr4xGdHvgT9 |
| PRD | Fuera del repo (es público). Se comparte por el grupo del equipo |

---

## 1. Qué es SIAM

Sistema de Agenda Médica para reservar citas en una clínica con varias especialidades. Se construye en **48 horas** como prueba técnica (perfiles Frontend, Backend y Fullstack).

**Flujo que tiene que funcionar de punta a punta (lo evalúan):**
seleccionar fecha → agendar → ver la cita en la lista → cancelar.

### Usuario final

| Pantalla | Usuario principal | Para qué |
| --- | --- | --- |
| Vista 1 · Agendar cita (`/`) | Paciente o recepcionista | Elegir especialidad, fecha y horario libre, y reservar con nombre y email |
| Vista 2 · Citas agendadas (`/citas`) | Recepción de la clínica (uso interno) | Ver todas las citas, filtrarlas, cancelarlas o reprogramarlas |
| Dashboard (`/dashboard`) | Recepción o coordinación de la clínica | Ver métricas de la agenda y descargar reportes |

- No hay login ni roles (fuera de alcance). Ambas vistas están abiertas.
- Como la Vista 2 muestra las citas de **todos** los pacientes, es un panel interno de recepción, no "mis citas" de un paciente.

### Alcance

**Dentro:** 4 especialidades fijas, un médico por especialidad, bloques de 30 min, reservar, listar con filtros, reprogramar, cancelar, prevención de overbooking, validaciones, estados de carga y error, responsive, Docker, un test E2E, README.

**Extra (no lo pide el PRD):** dashboard de métricas (fase 4) y, en una segunda etapa, descarga de reportes en CSV y Excel. No bloquean el flujo principal: si no llegan a tiempo, quedan como mejora futura.

**Fuera:** autenticación, varios médicos por especialidad, varias sucursales, notificaciones por email, pagos, CI/CD, despliegue en la nube.

### Reglas de negocio

- Citas solo de **lunes a viernes, 09:00 a 18:00**, en la zona `America/La_Paz` (`CLINIC_TZ`).
- Bloques de **30 minutos**: 18 slots por día y especialidad (el último empieza 17:30).
- No se agenda en fechas u horas pasadas.
- **Un médico por especialidad**: no puede haber dos citas activas con la misma especialidad a la misma hora.
- Cancelar = cancelación suave (`status = CANCELLED`); el slot vuelve a quedar libre.
- Especialidades: `MEDICINA_GENERAL`, `PEDIATRIA`, `CARDIOLOGIA`, `DERMATOLOGIA`.

---

## 2. Equipo

| Rol | Responsable de | PRs |
| --- | --- | --- |
| Lead (Fullstack) | Repo, contrato de API, integración, Docker, E2E, README, revisa todos los PRs | PR-01, 02, 15, 16, 17, 18 |
| Backend | API NestJS, Prisma, reglas de horario, antioverbooking, métricas y reportes | PR-03 a PR-08, PR-19, PR-21 |
| Front A | Vista 1, capa API, tema y componentes base, `SlotGrid`, `DayStrip`, dashboard | PR-09, 10, 11, 20, 22 |
| Front B | Vista 2, modales cancelar/reprogramar, pulido UX | PR-12, 13, 14 |

---

## 3. Stack

| Capa | Tecnología |
| --- | --- |
| Gestor de paquetes | **pnpm 12** (workspaces), Node 22 o superior |
| Backend | NestJS + TypeScript |
| Validación backend | `class-validator` + `class-transformer` (DTOs) |
| Base de datos | SQLite + Prisma |
| Frontend | Next.js (App Router) + React + TypeScript |
| Estilos | Tailwind CSS con el tema de los mockups |
| Datos en el front | TanStack Query |
| Formularios | react-hook-form + zod |
| Gráficos | Recharts |
| Reportes Excel | exceljs (el CSV se arma sin librería) |
| Tests backend | Vitest (incluido en Nest 12) |
| Tests E2E | Playwright |
| Ejecución | Docker Compose (un solo comando) |

Versiones fijadas en el PR-01 (la última estable compatible de cada una):

| Paquete | Versión | Nota |
| --- | --- | --- |
| pnpm | 12.6.0 | Rechaza paquetes publicados hace menos de 24 h (`minimumReleaseAge`): no se desactiva |
| NestJS | 12.1 | |
| Next.js / React | 16.3 / 19.3 | |
| TypeScript | 6.0 | TS 7 aún no es compatible con typescript-eslint |
| ESLint (front) | 9 | Los plugins de `eslint-config-next` todavía no soportan ESLint 10 |
| Vitest | 5.0 | Alias de tsconfig con `resolve.tsconfigPaths` de Vite (sin plugin) |
| Tailwind CSS | 4.3 | |

No se usan las rutas API de Next.js: el backend es un servicio separado. No hay CI/CD en este proyecto.

---

## 4. Arquitectura

```
Navegador
   │
   ▼
Next.js :3000 (App Router)
   app/ (rutas) → features/ (pantallas) → TanStack Query (caché) → lib/api (fetch o mocks)
   │
   │  REST JSON  (http://localhost:3001/api)
   ▼
NestJS :3001
   Controllers + DTOs (validan la entrada)
        → Services (reglas de negocio; ScheduleService = reglas de horario)
        → Repository / Prisma
   │
   ▼
SQLite (siam.db) — índice único parcial = antioverbooking
```

- **Estilo:** cliente-servidor por REST. El backend es un **monolito modular por capas** (módulos de Nest: controller → service → repositorio). El frontend está organizado **por features**.
- **Por qué así:** es simple, cada persona trabaja en carpetas separadas (casi sin conflictos de Git) y cumple lo que evalúa el PRD (estructura, validación, errores HTTP correctos, concurrencia).

### Escalabilidad

| Pieza | Hoy | Cómo escalaría |
| --- | --- | --- |
| API NestJS | Una instancia; no guarda estado en memoria | Varias instancias detrás de un balanceador (es stateless) |
| Base de datos | SQLite: un archivo, un solo escritor a la vez | Cambiar el `provider` de Prisma a **PostgreSQL**. El índice único parcial funciona igual, así que la protección contra overbooking no cambia |
| Frontend | Next.js en un contenedor | Varias instancias o un CDN; no tiene estado de servidor |

SQLite es la única pieza que limita a una instancia. Para este alcance está bien y evita que alguien tenga que instalar una base de datos.

### Caché

- **Solo en el cliente, con TanStack Query.** No hay caché en el servidor (Redis) porque la consulta de disponibilidad es barata y cachearla en el servidor podría mostrar horarios que ya se ocuparon.
- Claves: `['availability', date, specialty]`, `['appointments', filters]` y `['metrics', from, to, specialty]`.
- Disponibilidad: `staleTime` 15 s, `refetchOnWindowFocus: true` y `refetchInterval` 30 s en la Vista 1. Métricas: `staleTime` 60 s.
- Toda mutación (crear, reprogramar, cancelar) invalida `availability`, `appointments` y `metrics`.

### Tiempo real

- **No hay WebSockets.** La grilla se refresca sola cada 30 s y al volver a la pestaña.
- Si dos personas eligen el mismo horario, la base de datos acepta solo una. La otra recibe 409 y el front muestra "Ese horario acaba de ser tomado" y recarga la grilla.
- Mejora futura: SSE o WebSocket (Gateway de Nest) para avisar al instante cuando un slot se ocupa.

### Concurrencia y buen manejo de la base de datos

- El overbooking se bloquea **en la base de datos**, no solo en el código:
  `UNIQUE (specialty, startTime) WHERE status = 'ACTIVE'`.
- El servicio **inserta directo** y, si Prisma lanza `P2002`, responde `409 SLOT_TAKEN`. No se hace "consultar y luego insertar", porque entre los dos pasos otra petición puede colarse.
- `PATCH` (reprogramar) queda protegido por el mismo índice.
- Fechas guardadas en **UTC**; las reglas de horario se evalúan en `CLINIC_TZ`.
- SQLite con `PRAGMA journal_mode = WAL` y `PRAGMA busy_timeout = 5000` al iniciar `PrismaService`, para que las escrituras simultáneas esperen su turno en vez de fallar con "database is locked".
- Migraciones versionadas en `prisma/migrations` y seed con datos de ejemplo.

### Si hubiera varias sucursales (mejora futura)

- Todas las sucursales deben usar **una sola base de datos central**. Así el índice único protege aunque dos recepcionistas de sucursales distintas reserven al mismo tiempo. Con una base por sucursal no hay forma de evitar el choque.
- Modelo que haría falta:
  - `Branch(id, name, timezone)`
  - `Doctor(id, name, specialty)`
  - `DoctorSchedule(doctorId, branchId, weekday, start, end)`
  - `Appointment(..., doctorId, branchId)`
- El índice pasa a ser `UNIQUE (doctorId, startTime) WHERE status = 'ACTIVE'`: un médico no puede tener dos citas a la misma hora, ni siquiera en sucursales distintas.
- Se usaría PostgreSQL en lugar de SQLite.

---

## 5. Modelo de datos

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Appointment {
  id           String   @id @default(uuid())
  patientName  String
  patientEmail String
  specialty    String
  startTime    DateTime
  endTime      DateTime
  status       String    @default("ACTIVE")
  cancelledAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([startTime])
  @@index([specialty, startTime])
}
```

Índice parcial (se agrega a mano en el `migration.sql`, porque Prisma no lo genera):

```sql
CREATE UNIQUE INDEX "appointment_active_slot_unique"
ON "Appointment"("specialty", "startTime")
WHERE "status" = 'ACTIVE';
```

| Campo | Regla |
| --- | --- |
| `patientName` | 2 a 100 caracteres |
| `patientEmail` | Email válido |
| `specialty` | Una de las 4 especialidades |
| `startTime` | L-V, 09:00–17:30, minutos 00 o 30, en el futuro |
| `endTime` | `startTime` + 30 min |
| `status` | `ACTIVE` o `CANCELLED` |
| `cancelledAt` | Se llena al cancelar; lo usan las métricas |

---

## 6. Contrato de la API

> **La fuente de verdad es [`docs/api.md`](docs/api.md)** (request, respuesta y errores de cada endpoint). Aquí va el resumen.

Base: `http://localhost:3001/api`. Fechas en ISO 8601 con zona (`2026-09-28T09:00:00-04:00`). Los días (`date`, `from`, `to`) son `YYYY-MM-DD` en `CLINIC_TZ` y los rangos incluyen los dos extremos.

| Método | Ruta | Uso | Éxito | Errores |
| --- | --- | --- | --- | --- |
| GET | `/health` | Salud del servicio | 200 | – |
| GET | `/availability?date=YYYY-MM-DD&specialty=` | Slots del día (`specialty` opcional) | 200 | 400 |
| POST | `/appointments` | Reservar | 201 | 400, 409, 422 |
| GET | `/appointments?specialty=&date=&status=` | Listar (`status`: `ACTIVE` por defecto, `CANCELLED` o `ALL`; orden por hora) | 200 | 400 |
| PATCH | `/appointments/:id` | Reprogramar (`{ "startTime" }`, misma especialidad) | 200 | 400, 404, 409, 422 |
| DELETE | `/appointments/:id` | Cancelar (soft delete, guarda `cancelledAt`) | 204 | 404, 409 |
| GET | `/metrics/summary?from=&to=&specialty=` | Métricas del rango para el dashboard | 200 | 400 |
| GET | `/reports/appointments?from=&to=&specialty=&status=&format=` | Descargar reporte CSV o Excel (fase 2) | 200 (archivo) | 400 |

`GET /availability` devuelve:

```json
{
  "date": "2026-09-28",
  "isBusinessDay": true,
  "slots": [
    { "specialty": "PEDIATRIA", "startTime": "2026-09-28T09:00:00-04:00", "endTime": "2026-09-28T09:30:00-04:00", "available": true }
  ]
}
```

Sábado o domingo: 200 con `isBusinessDay: false` y `slots: []`. Slots pasados: `available: false`. Los slots van ordenados por `startTime` y luego por especialidad.

`POST /appointments` recibe `{ patientName, patientEmail, specialty, startTime }` y devuelve la cita completa (`id`, campos, `endTime`, `status`, `cancelledAt`, `createdAt`). `GET /appointments` devuelve `{ "data": [ ...citas ] }`.

`GET /metrics/summary` devuelve (ejemplo):

```json
{
  "range": { "from": "2026-09-28", "to": "2026-10-02", "businessDays": 5 },
  "totals": { "active": 86, "cancelled": 9, "capacity": 360, "occupancyRate": 0.239, "cancellationRate": 0.095 },
  "bySpecialty": [
    { "specialty": "MEDICINA_GENERAL", "active": 28, "cancelled": 3, "capacity": 90, "occupancyRate": 0.311 }
  ],
  "byDay": [ { "date": "2026-09-28", "active": 22, "cancelled": 2 } ],
  "byHour": [ { "hour": "10:00", "active": 15 } ]
}
```

- `from` y `to` opcionales (por defecto, la semana actual); rango máximo de 92 días. `specialty` opcional.
- `capacity` = días hábiles × 18 × especialidades incluidas (4, o 1 si viene `specialty`).
- `occupancyRate` = `active` / `capacity`; `cancellationRate` = `cancelled` / (`active` + `cancelled`); 0 si el divisor es 0.
- `byDay` y `byHour` en `CLINIC_TZ`; `byHour` agrupa por hora de inicio (09:00 a 17:00).

`GET /reports/appointments` (fase 2) recibe `from`, `to`, `specialty`, `status` (`ACTIVE`, `CANCELLED` o `ALL`, por defecto `ALL`) y `format` (`csv` o `xlsx`):

- Responde el archivo con `Content-Disposition: attachment; filename="siam-citas_2026-09-28_2026-10-02.csv"`, expuesto por CORS (`exposedHeaders`).
- Columnas: ID, Paciente, Email, Especialidad, Fecha, Hora inicio, Hora fin, Estado, Creada. Fechas en `CLINIC_TZ`; especialidad y estado en español.
- CSV en UTF-8 con BOM; Excel con encabezados en negrita.

**Formato de error (igual en todos los endpoints):**

```json
{ "statusCode": 409, "code": "SLOT_TAKEN", "message": "El horario ya está ocupado para Pediatría", "details": [] }
```

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Campos faltantes o inválidos (`details` por campo) |
| 404 | `NOT_FOUND` | La cita no existe |
| 409 | `SLOT_TAKEN` | Slot ya reservado en esa especialidad |
| 409 | `ALREADY_CANCELLED` | Reprogramar o cancelar una cita cancelada |
| 422 | `OUTSIDE_BUSINESS_HOURS` | Fin de semana, fuera de 09:00–18:00, minutos distintos de 00/30 o fecha pasada |
| 500 | `INTERNAL_ERROR` | Error inesperado (mensaje genérico; el detalle solo va al log) |

**Tipos del front:** están en `frontend/src/types/api.ts` y tienen que coincidir con `docs/api.md`. Del lado del backend, las especialidades y sus nombres en español están en `backend/src/common/constants/specialties.ts`.

---

## 7. Estructura del proyecto y rutas

```
siam-agenda-medica/
├── backend/
├── frontend/
├── e2e/                    ← Playwright (PR-17)
├── docs/
│   └── api.md              ← contrato de la API (PR-02)
├── .github/
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── CONTEXTO.md             ← este archivo
├── docker-compose.yml      ← PR-16
├── package.json            ← scripts de la raíz
├── pnpm-workspace.yaml
├── .gitignore
└── README.md
```

### Backend (NestJS)

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts                       ← prefijo /api, ValidationPipe, CORS, puerto 3001
│   ├── app.module.ts
│   ├── common/
│   │   ├── constants/specialties.ts
│   │   └── filters/http-exception.filter.ts
│   ├── database/
│   │   ├── database.module.ts        ← global
│   │   └── prisma.service.ts         ← WAL + busy_timeout al iniciar
│   ├── schedule/
│   │   ├── schedule.module.ts
│   │   ├── schedule.service.ts       ← genera y valida slots (lógica pura)
│   │   └── schedule.service.spec.ts
│   ├── availability/
│   │   ├── availability.module.ts
│   │   ├── availability.controller.ts
│   │   ├── availability.service.ts
│   │   └── dto/availability-query.dto.ts
│   ├── appointments/
│   │   ├── appointments.module.ts
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── appointments.repository.ts
│   │   ├── appointments.service.spec.ts
│   │   └── dto/
│   │       ├── create-appointment.dto.ts
│   │       ├── update-appointment.dto.ts
│   │       └── query-appointments.dto.ts
│   ├── metrics/                      ← PR-19
│   │   ├── metrics.module.ts
│   │   ├── metrics.controller.ts
│   │   ├── metrics.service.ts
│   │   └── dto/metrics-query.dto.ts
│   └── reports/                      ← PR-21 (fase 2)
│       ├── reports.module.ts
│       ├── reports.controller.ts
│       ├── reports.service.ts        ← CSV sin librería, Excel con exceljs
│       └── dto/report-query.dto.ts
├── test/appointments.e2e-spec.ts     ← incluye el test de concurrencia
├── .env.example                      ← PORT=3001, DATABASE_URL="file:./siam.db", CLINIC_TZ=America/La_Paz
└── Dockerfile
```

| Método y ruta | Controller | Service |
| --- | --- | --- |
| `GET /api/health` | `AppController.health` | – |
| `GET /api/availability` | `AvailabilityController.findDay` | `AvailabilityService.getDay` → `ScheduleService.generateSlots` |
| `POST /api/appointments` | `AppointmentsController.create` | `AppointmentsService.create` → `ScheduleService.validateSlot` |
| `GET /api/appointments` | `AppointmentsController.findAll` | `AppointmentsService.findAll` |
| `PATCH /api/appointments/:id` | `AppointmentsController.reschedule` | `AppointmentsService.reschedule` |
| `DELETE /api/appointments/:id` | `AppointmentsController.cancel` | `AppointmentsService.cancel` |
| `GET /api/metrics/summary` | `MetricsController.summary` | `MetricsService.getSummary` → `ScheduleService.countBusinessDays` |
| `GET /api/reports/appointments` | `ReportsController.appointments` | `ReportsService.build` (CSV o Excel) |

### Frontend (Next.js)

```
frontend/src/
├── app/
│   ├── layout.tsx              ← header y navegación, fuentes
│   ├── providers.tsx           ← QueryClientProvider + Toaster
│   ├── page.tsx                ← Vista 1 · Agendar cita
│   ├── citas/page.tsx          ← Vista 2 · Citas agendadas
│   └── dashboard/page.tsx      ← Dashboard de métricas y reportes
├── components/ui/              ← Button, Input, Select, Modal, Spinner, EmptyState, SpecialtyTag
├── features/
│   ├── availability/           ← Front A: DatePicker, DayStrip, SpecialtyPills, SlotGrid, useAvailability
│   ├── booking/                ← Front A: BookingForm, schema.ts (zod), useCreateAppointment
│   ├── appointments/           ← Front B: AppointmentList, AppointmentFilters, CancelDialog,
│   │                              RescheduleDialog, useAppointments, useCancel, useReschedule
│   └── dashboard/              ← Front A: DateRangeFilter, KpiCard, AppointmentsByDayChart,
│                                  SpecialtyOccupancy, PeakHoursChart, ReportDownloadCard, useMetrics
├── lib/api/                    ← client.ts, availability.ts, appointments.ts, metrics.ts, reports.ts, mocks.ts
└── types/api.ts
```

| Ruta | Archivo | Pantalla (mockup) | Componentes |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | Vista 1 · Agendar cita / Vista 1 · Móvil | `SpecialtyPills`, `DatePicker` (escritorio), `DayStrip` (móvil), `SlotGrid` (3 col), `BookingForm` |
| `/citas` | `app/citas/page.tsx` | Vista 2 · Mis citas / Vista 2 · Móvil | `AppointmentFilters`, `AppointmentList` (tabla / tarjetas), `CancelDialog`, `RescheduleDialog` (`DayStrip` + `SlotGrid` de 6 col) |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard · Métricas y reportes | `DateRangeFilter`, 4 × `KpiCard`, `AppointmentsByDayChart`, `SpecialtyOccupancy`, `PeakHoursChart`, `ReportDownloadCard` |

Los modales no son rutas: se abren con estado dentro de `/citas`.

Variables del front (`frontend/.env.example`): `NEXT_PUBLIC_API_URL=http://localhost:3001/api` y `NEXT_PUBLIC_USE_MOCKS=true`.

### Tema visual (de los mockups)

| Token | Valor | Uso |
| --- | --- | --- |
| `primary` | `#0E6B73` | Botones principales, seleccionado |
| `primary-soft` | `#E3F0EF` | Fondos suaves, chips |
| `bg` | `#F5F4EF` | Fondo de página |
| `ink` | `#17212B` | Texto principal |
| `muted` | `#5B6570` | Texto secundario |
| `line` | `#E3E1DA` | Bordes |
| `busy` | `#EDEBE5` | Slot ocupado |
| `danger` | `#B42318` | Errores, cancelar |
| Fuentes | Fraunces (títulos), Instrument Sans (texto) | `next/font` |

Colores de `SpecialtyTag`: Medicina General `#EAF0FA`/`#2B4A7E`, Pediatría `#E3F0EF`/`#0A5258`, Cardiología `#FBEAE4`/`#9A3412`, Dermatología `#F2ECF8`/`#633A86`.

---

## 8. Cómo trabajamos

### Ramas

- `main`: solo entregas. `develop`: integración. Nadie hace push directo a ninguna de las dos.
- Cada tarea sale de `develop`: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…`, más `be-` o `fe-` (`feat/fe-booking-form`).
- Las ramas de feature las crea cada persona **cuando empieza su tarjeta**, no todas al inicio.
- Los PR van siempre hacia `develop`, con **merge commit** (no squash) para que se vean los commits.

### Commits (Conventional Commits)

`tipo(alcance): descripción en imperativo`. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.

```
feat(api): agrega endpoint GET /availability
fix(booking): corrige zona horaria al enviar la fecha
test(schedule): cubre sábados y 18:00
```

Un commit por paso lógico, varias veces al día. Nada de "cambios" o "wip".

### Pull requests

- Menos de 400 líneas, con la plantilla llena y el enlace a la tarjeta de Trello.
- 1 aprobación antes del merge. El Lead revisa todos; Front A y Front B se revisan entre sí; Backend revisa los PR del Lead.
- Revisión en menos de 2 horas.
- Mover la tarjeta de Trello: In Progress → Code Review → Testing → Done.

### Definition of Done

- Cumple los criterios de aceptación de su tarjeta y coincide con el mockup (si es UI).
- PR aprobado y mergeado en `develop`, probado junto con lo demás.
- Sin `console.log`, código comentado ni TODO sin tarjeta.
- Si cambió el contrato o la forma de ejecutar, está actualizado en `docs/api.md`, este archivo o el README.

### Reglas del equipo

- El contrato de la API (`docs/api.md`) solo cambia con un PR propio, avisando al equipo.
- Avisar en el grupo antes de instalar una librería.
- Solo se sube `.env.example`, nunca `.env`.
- Conflicto en `pnpm-lock.yaml`: aceptar el de `develop`, correr `pnpm install` y hacer commit del lock regenerado.
- `pnpm` siempre, nunca `npm install` ni `yarn` (rompen el lockfile).
- Un paquete nuevo que ejecuta scripts al instalarse se aprueba o se niega en `allowBuilds` de `pnpm-workspace.yaml` (`pnpm approve-builds`).

### Backend en ESM

El backend es ESM (`"type": "module"`, `module: nodenext`): los imports relativos llevan **`.js`** aunque el archivo sea `.ts`.

```ts
import { SPECIALTIES } from '../common/constants/specialties.js';
```

Sin la extensión compila en el editor pero falla al arrancar con `ERR_MODULE_NOT_FOUND`. Los `nest g` ya la ponen solos.

### Qué va y qué no en el repositorio

| Sí se sube | No se sube (lo cubre `.gitignore`) |
| --- | --- |
| Código fuente, tests y configuración (`tsconfig`, `eslint`, `vitest`, `next.config`) | `node_modules/`, `.pnpm-store/` |
| `package.json` y **un solo** `pnpm-lock.yaml` en la raíz | Builds: `dist/`, `.next/`, `*.tsbuildinfo`, `next-env.d.ts` |
| `.env.example` de cada app | `.env` y cualquier `.env.*` con valores reales |
| `prisma/schema.prisma`, `prisma/migrations/` y `seed.ts` | La base local: `*.db`, `*.db-wal`, `*.db-shm`, `*.db-journal` |
| `docs/` (sin el PRD), `CONTEXTO.md`, `README.md`, `.github/` | Reportes: `coverage/`, `playwright-report/`, `test-results/` |
| `frontend/AGENTS.md` y `CLAUDE.md` (los regenera `next dev`) | Logs, `.DS_Store`, `.idea/`, `.vscode/` (salvo `extensions.json`) |

- Hay un único `.gitignore` en la raíz; no se crean otros en las subcarpetas.
- `.gitattributes` fuerza finales de línea LF en todo el repo (Windows y Docker no se pelean). Los binarios (`.pdf`, imágenes, `.xlsx`) van marcados como `binary`.
- Nada de secretos, tokens ni datos reales de pacientes, ni siquiera en los seeds: el repo es público.

---

## 9. Puesta en marcha (Lead)

> En Windows, usar **Git Bash** para estos comandos.

### Paso 0 · Requisitos (cada integrante)

```bash
node -v                      # 22 o superior
npm i -g pnpm@12             # corepack no instala pnpm 12
pnpm -v                      # 12.x
git config --global user.name "Tu Nombre"
git config --global user.email "tu@correo.com"
```

### Paso 1 · Rama `main` y commit inicial

Si el repo en GitHub está vacío:

```bash
git clone https://github.com/garcia-bj/siam-agenda-medica.git
cd siam-agenda-medica
echo "# SIAM – Sistema de Agenda Médica" > README.md
printf "node_modules/\ndist/\n.next/\n.env\n*.db\n*.db-journal\n*.db-wal\n*.db-shm\ncoverage/\nplaywright-report/\ntest-results/\n.DS_Store\n" > .gitignore
git add .
git commit -m "chore: commit inicial"
git branch -M main           # renombra la rama local a main
git push -u origin main
```

Si ya subiste una rama `master`:

```bash
git branch -m master main
git push -u origin main
# GitHub → Settings → General → Default branch: main
git push origin --delete master
```

### Paso 2 · Rama `develop`

```bash
git checkout -b develop
git push -u origin develop
```

En GitHub → Settings:

- **General:** Default branch `develop`; solo "Allow merge commits"; activar "Automatically delete head branches".
- **Branches:** reglas para `main` y `develop` con "Require a pull request before merging" y 1 aprobación. En un repo privado con cuenta gratuita estas reglas no se aplican: hacerlo público o confiar en la disciplina del equipo.
- **Collaborators:** los 3 integrantes.

### Paso 3 · PR-01: monorepo y esqueleto con rutas

```bash
git checkout develop
git checkout -b chore/setup
```

**Workspace de pnpm:**

```bash
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - backend
  - frontend
allowBuilds:
  '@prisma/client': true
  '@prisma/engines': true
  prisma: true
  unrs-resolver: false
EOF

cat > package.json <<'EOF'
{
  "name": "siam",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter backend --filter frontend dev",
    "dev:back": "pnpm --filter backend dev",
    "dev:front": "pnpm --filter frontend dev",
    "lint": "pnpm -r lint",
    "test": "pnpm --filter backend test"
  }
}
EOF

npm pkg set packageManager=pnpm@12.6.0
git add . && git commit -m "chore(repo): configura workspace de pnpm"
```

**Backend:**

```bash
pnpm dlx @nestjs/cli new backend --package-manager pnpm --skip-git --strict
cd backend
npm pkg set scripts.dev="nest start --watch"   # solo edita el package.json
```

En `backend/src/main.ts`, cambiar el puerto a `process.env.PORT ?? 3001` (Next.js ya usa el 3000).

```bash
git add . && git commit -m "chore(backend): crea proyecto NestJS"

pnpm exec nest g module schedule
pnpm exec nest g service schedule
pnpm exec nest g module availability
pnpm exec nest g controller availability
pnpm exec nest g service availability
pnpm exec nest g module appointments
pnpm exec nest g controller appointments
pnpm exec nest g service appointments
pnpm exec nest g module database
mkdir -p src/common/constants src/common/filters src/appointments/dto src/availability/dto
find src -type d -empty -exec touch {}/.gitkeep \;
printf "PORT=3001\nDATABASE_URL=\"file:./siam.db\"\nCLINIC_TZ=America/La_Paz\n" > .env.example
cd ..
git add . && git commit -m "chore(backend): agrega módulos vacíos de schedule, availability y appointments"
```

**Frontend:**

```bash
pnpm create next-app@latest frontend --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --disable-git --yes
git add . && git commit -m "chore(frontend): crea proyecto Next.js"

cd frontend/src
mkdir -p app/citas components/ui lib/api types \
  features/availability/components features/availability/hooks \
  features/booking/components features/booking/hooks \
  features/appointments/components features/appointments/hooks
cat > app/citas/page.tsx <<'EOF'
export default function CitasPage() {
  return <main>Citas agendadas</main>;
}
EOF
find . -type d -empty -exec touch {}/.gitkeep \;
cd ..
printf "NEXT_PUBLIC_API_URL=http://localhost:3001/api\nNEXT_PUBLIC_USE_MOCKS=true\n" > .env.example
cd ..
git add . && git commit -m "chore(frontend): agrega rutas y carpetas por feature"
```

**Lockfile único, plantillas y contexto:**

```bash
rm -f backend/pnpm-lock.yaml frontend/pnpm-lock.yaml
pnpm install
git add . && git commit -m "chore(repo): unifica lockfile en la raíz"

mkdir -p docs e2e .github
touch e2e/.gitkeep
# Copiar: .github/pull_request_template.md y .github/CODEOWNERS (sección Plantillas del plan),
# y este CONTEXTO.md en la raíz
git add . && git commit -m "docs(repo): agrega contexto, plantilla de PR y CODEOWNERS"

git push -u origin chore/setup
```

Abrir el PR `chore/setup → develop` en GitHub y pedir la aprobación del Backend.

**Probar:**

```bash
pnpm dev          # backend en :3001 y frontend en :3000
```

Si pnpm muestra "Ignored build scripts", correr `pnpm approve-builds` y aprobar o negar el paquete en `allowBuilds`.

### Día a día (todos)

```bash
git checkout develop && git pull origin develop
git checkout -b feat/fe-booking-form
# ...trabajo y commits chicos...
git push -u origin feat/fe-booking-form
# abrir PR hacia develop; si develop avanzó:
git fetch origin && git rebase origin/develop && git push --force-with-lease
# después del merge:
git checkout develop && git pull origin develop && git branch -d feat/fe-booking-form
```

---

## 10. Plan de PRs

El detalle de cada PR (historia, criterios, checklist) está en su tarjeta de Trello.

| PR | Rama | Responsable | Depende de | Vence | Estado |
| --- | --- | --- | --- | --- | --- |
| PR-01 · Monorepo y esqueleto con rutas | `chore/setup` | Lead | – | hora 3 | Pendiente |
| PR-02 · Contrato de la API | `docs/api-contract` | Lead | PR-01 | hora 4 | Pendiente |
| PR-03 · Estructura base NestJS | `feat/be-structure` | Backend | PR-01 | hora 6 | Pendiente |
| PR-04 · Prisma + SQLite + índice | `feat/be-db` | Backend | PR-03 | hora 8 | Pendiente |
| PR-05 · Reglas de horario | `feat/be-schedule-rules` | Backend | PR-03 | hora 10 | Pendiente |
| PR-06 · GET /availability | `feat/be-availability` | Backend | PR-04, 05 | hora 12 | Pendiente |
| PR-07 · POST /appointments | `feat/be-create` | Backend | PR-04, 05 | hora 15 | Pendiente |
| PR-08 · Listar, reprogramar, cancelar | `feat/be-manage` | Backend | PR-07 | hora 20 | Pendiente |
| PR-09 · Capa API, mocks, tema, UI base | `feat/fe-api-layer` | Front A | PR-02 | hora 7 | Pendiente |
| PR-10 · Calendario, DayStrip, SlotGrid | `feat/fe-availability` | Front A | PR-09 | hora 11 | Pendiente |
| PR-11 · Formulario de reserva | `feat/fe-booking-form` | Front A | PR-10 | hora 16 | Pendiente |
| PR-12 · Lista de citas con filtros | `feat/fe-appointments-list` | Front B | PR-09 | hora 12 | Pendiente |
| PR-13 · Cancelar y reprogramar | `feat/fe-cancel-reschedule` | Front B | PR-10, 12 | hora 18 | Pendiente |
| PR-14 · Pulido UX y responsive | `feat/fe-ux-polish` | Front B | PR-11, 13 | hora 30 | Pendiente |
| PR-15 · Integración con la API real | `feat/integration` | Lead | PR-08, 11, 13 | hora 24 | Pendiente |
| PR-16 · Docker Compose | `chore/docker` | Lead | PR-15 | hora 34 | Pendiente |
| PR-17 · E2E con Playwright | `test/e2e` | Lead | PR-15 | hora 38 | Pendiente |
| PR-18 · README final | `docs/readme` | Lead | PR-16 | hora 42 | Pendiente |
| PR-19 · Endpoint de métricas | `feat/be-metrics` | Backend | PR-08 | hora 24 | Pendiente |
| PR-20 · Dashboard de métricas | `feat/fe-dashboard` | Front A | PR-09 | hora 28 | Pendiente |
| PR-21 · Exportar reportes (CSV y Excel) | `feat/be-reports` | Backend | PR-19 | hora 30 | Pendiente |
| PR-22 · Descargar reportes desde el dashboard | `feat/fe-reports` | Front A | PR-20, 21 | hora 34 | Pendiente |

PR-19 a PR-22 son la fase 4 (métricas y reportes): no bloquean la entrega. Las horas cuentan desde el kickoff. Congelamiento de código en la hora 42; release `develop → main` y tag `v1.0.0` antes de la hora 48.

---

## 11. Decisiones pendientes

- [x] Renombrar el repo a `siam-agenda-medica`.
- [ ] Repo público o privado (define si la protección de ramas se aplica).
- [ ] Nombre del menú de la Vista 2: el mockup dice "Mis citas"; se recomienda "Citas agendadas" porque la vista es de recepción y muestra todas las citas.
- [ ] Hora 0 del kickoff (para poner las fechas de vencimiento en Trello).
