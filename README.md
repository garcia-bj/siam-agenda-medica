# SIAM – Sistema de Agenda Médica
Sistema web para la gestión y reserva de citas médicas. Permite consultar disponibilidad, agendar citas, visualizar las citas registradas, cancelar y reagendar, gestionar médicos, consultar métricas y descargar informes.

---

## Índice

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Requisitos previos](#3-requisitos-previos)
4. [Instalar pnpm](#4-instalar-pnpm)
5. [Clonar el proyecto](#5-clonar-el-proyecto)
6. [Ejecutar el proyecto con Docker](#6-ejecutar-el-proyecto-con-docker)
7. [Ejecutar el proyecto sin Docker](#7-ejecutar-el-proyecto-sin-docker)
8. [Funcionalidades principales](#8-funcionalidades-principales)
9. [Pruebas](#9-pruebas)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Decisiones de diseño](#11-decisiones-de-diseño)
12. [Decisiones técnicas](#12-decisiones-técnicas)
13. [Supuestos y limitaciones](#13-supuestos-y-limitaciones)
14. [Estados contemplados](#14-estados-contemplados)
15. [Problemas conocidos](#15-problemas-conocidos)
16. [Mejoras futuras](#16-mejoras-futuras)
17. [Flujo principal del sistema](#17-flujo-principal-del-sistema)
18. [Verificación desde cero](#18-verificación-desde-cero)
19. [Estado del proyecto](#19-estado-del-proyecto)

---

## 1. Descripción del proyecto

SIAM Agenda Médica busca facilitar la gestión de citas médicas mediante una interfaz web sencilla y responsive.

El sistema permite:

- Consultar fechas y horarios disponibles.
- Agendar una cita médica.
- Visualizar las citas agendadas.
- Filtrar citas por fecha y especialidad.
- Cancelar una cita.
- Reagendar una cita.
- Gestionar médicos: registrar, editar, activar y desactivar.
- Consultar métricas de la agenda mediante un dashboard.
- Descargar informes de citas en CSV o Excel.
- Validar errores de disponibilidad y conflictos de horarios.
- Ejecutar pruebas unitarias y pruebas E2E del flujo principal.

**Reglas de negocio**

- Atención de lunes a viernes, de 09:00 a 18:00, en bloques de 30 minutos. **El último turno empieza a las 17:30**; no se puede reservar a las 18:00.
- **Todos los horarios son en hora de `America/La_Paz`.**
- Especialidades: Medicina General, Pediatría, Cardiología y Dermatología.
- Cada especialidad tiene **un solo médico activo**; ese médico atiende las citas de la especialidad.
- Una especialidad sin médico activo no tiene horarios y no permite agendar.
- Un médico con citas próximas no puede desactivarse.
- Un horario ocupado no se puede reservar dos veces.

---

## 2. Tecnologías utilizadas

**Frontend**

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query (datos del servidor)
- react-hook-form + zod (formularios y validación)
- Recharts (gráficos del dashboard)

**Backend**

- NestJS 12
- TypeScript
- SQLite (`better-sqlite3`)
- Prisma 7.10 (ORM)
- Luxon (fechas y zonas horarias)
- class-validator (validación)
- exceljs (informes en Excel)

**Gestión del proyecto**

- Node.js 24 (mínimo 22.12)
- pnpm 12.6.0 (workspace)
- Git / GitHub
- Docker

**Testing**

- Vitest (backend y frontend)
- React Testing Library
- Supertest (E2E de la API)
- Playwright (E2E del flujo completo)

---

## 3. Requisitos previos

Antes de ejecutar el proyecto se necesita:

- Git
- Node.js **22.12 o superior (recomendado 24)**. El `package.json` lo exige en `engines` porque Prisma 7 no se instala con una versión menor; Docker usa Node 24.
- pnpm **12.6.0** (ver la sección siguiente).
- Docker con Docker Compose v2, únicamente si se desea utilizar la configuración con Docker.

### Instalar Node.js

Descargar Node.js desde su página oficial: [Node.js](https://nodejs.org/)

Comprobar la instalación:

```bash
node --version
npm --version
```

`node --version` debe mostrar `v22.12` o superior (idealmente `v24`).

---

## 4. Instalar pnpm

El proyecto usa pnpm 12.6.0 (el valor de `packageManager`). Instalarlo con npm:

```bash
npm install -g pnpm@12.6.0
```

Comprobar la instalación:

```bash
pnpm --version
```

Debe mostrar `12.6.0`.

> No usar Corepack ni `pnpm@latest`. Corepack no logra instalar pnpm 12 (por eso los Dockerfiles usan npm; ver [`CONTEXTO.md`](CONTEXTO.md), §9) y `pnpm@latest` no asegura la versión del lockfile.

---

## 5. Clonar el proyecto

Clonar el repositorio:

```bash
git clone https://github.com/garcia-bj/siam-agenda-medica.git
```

Entrar al proyecto:

```bash
cd siam-agenda-medica
```

---

## 6. Ejecutar el proyecto con Docker

Docker levanta los servicios necesarios con la configuración del proyecto.

Comprobar que Docker y Docker Compose v2 estén instalados:

```bash
docker --version
docker compose version
```

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Al iniciar, el contenedor aplica las migraciones de la base de datos siempre y carga los datos de ejemplo (seed) solo la primera vez.

Una vez iniciados los servicios, acceder a: <http://localhost:3000>

Los puertos se pueden cambiar con las variables `WEB_PORT` (frontend) y `API_PORT` (API).

Para detener los servicios:

```bash
docker compose down
```

Para detenerlos y eliminar los volúmenes asociados (borra los datos):

```bash
docker compose down -v
```

---

## 7. Ejecutar el proyecto sin Docker

Esta opción ejecuta el frontend y el backend directamente con Node.js y pnpm. Desde la raíz del proyecto, en este orden:

```bash
# 1. Variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Dependencias
pnpm install

# 3. Base de datos: migraciones y datos de ejemplo
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec prisma db seed

# 4. Iniciar frontend y backend
pnpm dev
```

Sin los pasos 1 y 3, `pnpm dev` no arranca correctamente en un clon limpio.

Cuando termine de iniciar:

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001/api>

El puerto de la API (3001) viene de `PORT` en `backend/.env`; el 3000 es el de `next dev`.

No subir archivos `.env` con credenciales reales al repositorio.

---

## 8. Funcionalidades principales

### Agendar una cita

Desde la pantalla principal:

1. Seleccionar una especialidad.
2. Seleccionar una fecha disponible.
3. Seleccionar un horario.
4. Completar los datos solicitados.
5. Confirmar la cita.
6. Verificar el mensaje de confirmación.

Si la especialidad elegida no tiene médico activo, la pantalla lo indica y no muestra horarios. En ese caso hay que elegir otra especialidad o activar un médico desde `/medicos`.

### Consultar citas

Ingresar a `/citas`.

La pantalla permite:

- Visualizar las citas.
- Consultar paciente, especialidad, médico, fecha y hora.
- Filtrar por especialidad.
- Filtrar por fecha.
- Limpiar los filtros.
- Acceder a las acciones disponibles para cada cita.

En escritorio las citas se muestran en formato de tabla y en dispositivos móviles se adaptan a tarjetas.

### Cancelar una cita

Desde `/citas`:

1. Seleccionar una cita.
2. Presionar **Cancelar**.
3. Confirmar la acción.
4. Verificar el estado actualizado.

Cancelar libera el horario para que otra persona pueda reservarlo.

### Reagendar una cita

Desde la cita correspondiente:

1. Seleccionar **Reagendar**.
2. Elegir una nueva fecha.
3. Seleccionar un horario disponible.
4. Confirmar el cambio.

### Gestión de médicos

Ingresar a `/medicos`.

La pantalla permite:

- Ver la lista de médicos con su especialidad, estado (activo o inactivo) y número de próximas citas.
- Mostrar u ocultar los médicos inactivos.
- Registrar un médico nuevo.
- Editar los datos de un médico.
- Activar o desactivar un médico.

En escritorio los médicos se muestran en formato de tabla y en dispositivos móviles se adaptan a tarjetas.

**Registrar un médico**

1. Presionar **Registrar médico**.
2. Escribir el nombre completo.
3. Elegir la especialidad. El selector indica qué médico activo tiene cada especialidad y cuáles no tienen ninguno.
4. Confirmar con **Registrar médico**.
5. Verificar que aparece en la lista y que la especialidad vuelve a tener horarios para agendar.

**Desactivar un médico**

1. Localizar al médico en la lista.
2. Presionar **Desactivar**.
3. Si tiene citas próximas, el sistema no permite la acción y lo indica. Primero hay que cancelar o reagendar esas citas.
4. Una vez desactivado, su especialidad queda sin horarios hasta que haya otro médico activo.

**Reglas**

- Solo puede haber un médico activo por especialidad; la regla aplica al registrar y al activar (`409 SPECIALTY_HAS_DOCTOR`).
- Un médico con citas próximas no puede desactivarse (`409 DOCTOR_HAS_APPOINTMENTS`).
- Una especialidad sin médico activo no permite agendar citas (`422 NO_DOCTOR`).

### Dashboard

Ingresar a `/dashboard`.

El dashboard permite consultar métricas relacionadas con la agenda, incluyendo información sobre:

- Citas activas.
- Promedio de citas.
- Ocupación.
- Cancelaciones.
- Horarios más solicitados.
- Distribución de citas.

También permite aplicar filtros de fechas y especialidad.

**Informes:** desde el dashboard se puede descargar el informe de citas en **CSV** o **Excel**. El backend lo expone en `GET /api/reports/appointments`.

---

## 9. Pruebas

Con las dependencias ya instaladas (`pnpm install`), desde la raíz del proyecto.

### Pruebas unitarias (Vitest)

```bash
pnpm test
```

Corre las pruebas del backend y del frontend. En la raíz no existen `pnpm test:watch` ni `pnpm test:coverage`. Para la cobertura del backend:

```bash
pnpm --filter backend test:cov
```

### Pruebas E2E de la API (Supertest)

```bash
pnpm --filter backend test:e2e
```

### Pruebas E2E con Playwright

La primera vez, instalar el navegador:

```bash
pnpm --filter e2e exec playwright install chromium
```

Ejecutar las pruebas:

```bash
pnpm test:e2e
```

Este comando levanta por sí solo la API (puerto 3301) y el frontend (puerto 3300), con una base de datos nueva; no hace falta tener la app corriendo. Para ejecutarlas contra la app levantada con Docker, indicar las URLs con `E2E_BASE_URL` (frontend) y `E2E_API_URL` (API):

```bash
E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:3001/api pnpm test:e2e
```

---

## 10. Estructura del proyecto

```text
siam-agenda-medica/
│
├── backend/
│   └── src/
│
├── frontend/
│   └── src/
│
├── e2e/
│   ├── tests/
│   └── playwright.config.ts
│
├── docs/
│   └── api.md
│
├── docker-compose.yml
├── CONTEXTO.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

- `backend/`: API (NestJS + Prisma + SQLite).
- `frontend/`: interfaz web (Next.js).
- `e2e/`: pruebas end-to-end con Playwright.
- [`docs/api.md`](docs/api.md): contrato de la API.
- [`CONTEXTO.md`](CONTEXTO.md): contexto y decisiones del proyecto.
- `pnpm-workspace.yaml`: define el monorepo; `pnpm install` en la raíz instala las dependencias de todos los paquetes.
- `docker-compose.yml`: levanta el proyecto con Docker.

---

## 11. Decisiones de diseño

### Interfaz responsive

Se diseñó la interfaz considerando diferentes tamaños de pantalla:

- Móvil: aproximadamente 375 px.
- Tablet: aproximadamente 768 px.
- Escritorio: aproximadamente 1280 px.

En móvil se prioriza la visualización mediante tarjetas y controles accesibles, mientras que en escritorio se utiliza una distribución más amplia.

### Un médico activo por especialidad

Cada especialidad tiene un único médico activo. Así, al elegir la especialidad el paciente no necesita elegir médico y la disponibilidad se calcula sobre una sola agenda, lo que evita solapamientos y simplifica el cálculo de ocupación. El costo es que no hay agendas paralelas dentro de una misma especialidad (ver [Mejoras futuras](#16-mejoras-futuras)).

### Protección de citas al desactivar médicos

Un médico con citas próximas no puede desactivarse. Se evita así dejar citas activas sin médico atendiendo; primero deben cancelarse o reagendarse.

### Reutilización de componentes

Se priorizó la reutilización de componentes existentes para evitar duplicación y mantener un comportamiento consistente.

Entre los componentes reutilizados se encuentran elementos relacionados con:

- Selección de días.
- Disponibilidad de horarios.
- Modales.
- Tarjetas de citas y de médicos.
- Filtros.
- Acciones de cancelación y reagendamiento.

### Accesibilidad

Se utilizan elementos HTML semánticos, roles accesibles y etiquetas asociadas a los campos para facilitar la interacción con teclado y tecnologías de asistencia.

### Selectores para pruebas

Las pruebas E2E seleccionan los elementos por rol y nombre accesible, sin depender de clases CSS ni de la estructura interna del DOM.

---

## 12. Decisiones técnicas

### NestJS + Prisma + SQLite

- **NestJS:** estructura modular y validación integrada en el framework, adecuada para una API con varios módulos (citas, médicos, dashboard, informes).
- **Prisma:** esquema tipado y migraciones versionadas, con tipos compartidos entre el código y la base.
- **SQLite (better-sqlite3):** no requiere un servicio de base de datos aparte, por lo que `pnpm dev` y `docker compose up` funcionan en cualquier equipo. El costo es que admite un solo escritor a la vez (ver [Supuestos y limitaciones](#13-supuestos-y-limitaciones)).

### Prevención de doble reserva (antioverbooking)

La regla se garantiza en la base de datos, no solo en el código: un **índice único parcial** sobre `(specialty, startTime) WHERE status = 'ACTIVE'`. La cita se inserta directamente, sin consultar antes la disponibilidad; si dos solicitudes intentan el mismo horario a la vez, la segunda viola el índice, Prisma lanza `P2002` y la API lo traduce a `409 SLOT_TAKEN`. Lo mismo ocurre al reprogramar. Como el índice solo cuenta las citas activas, cancelar una cita libera el horario.

### Fechas y zona horaria

Las fechas se guardan en **UTC**. Las reglas de negocio (horario de atención, fines de semana, último turno a las 17:30) se evalúan en **`America/La_Paz`** con **Luxon**. La zona horaria se define en la variable `CLINIC_TZ`.

### Validación

- **Backend:** `class-validator` con `forbidNonWhitelisted`, que rechaza los campos no esperados.
- **Frontend:** `react-hook-form` con `zod`, para mostrar los errores por campo antes de enviar.

### Cancelación suave

Cancelar una cita la marca como `CANCELLED` y guarda `cancelledAt`; no se borra el registro. Así se conserva el historial para las métricas de cancelaciones y el índice parcial libera el horario.

### Médicos

Hay un solo médico activo por especialidad, garantizado con otro índice único parcial en la base de datos. Los errores asociados:


| Situación | Respuesta |
|---|---|
| Registrar o activar un médico en una especialidad que ya tiene uno activo | `409 SPECIALTY_HAS_DOCTOR` |
| Desactivar un médico con citas próximas | `409 DOCTOR_HAS_APPOINTMENTS` |
| Agendar en una especialidad sin médico activo | `422 NO_DOCTOR` |
| Horario ya ocupado | `409 SLOT_TAKEN` |

### Docker

Al iniciar, el contenedor aplica las migraciones en cada arranque y ejecuta el seed solo la primera vez, para no duplicar datos en reinicios.

### Informes

`GET /api/reports/appointments` genera el informe de citas en CSV o Excel (con exceljs), que se descarga desde el dashboard.

### Pruebas

Vitest en backend y frontend (unitarias), Supertest para los E2E de la API y Playwright para el flujo completo (ver [Pruebas](#9-pruebas)).

### Documentación adicional

El contrato de la API está en [`docs/api.md`](docs/api.md) y el contexto del proyecto en [`CONTEXTO.md`](CONTEXTO.md).

---

## 13. Supuestos y limitaciones

- **Sin autenticación:** cualquiera que acceda a la aplicación puede agendar, cancelar y gestionar médicos.
- **Sin paginación:** las listas (citas, médicos) se cargan completas.
- **Zona horaria fija:** todo el sistema opera en `America/La_Paz`; no se adapta a la zona del paciente.
- **SQLite con un solo escritor:** adecuado para un prototipo, no para alta concurrencia.
- **La cita guarda la especialidad, no el médico:** el médico se deduce del médico activo de la especialidad. Por eso una especialidad sin médico activo no puede recibir citas (`422 NO_DOCTOR`) y un médico con citas próximas no puede desactivarse (`409 DOCTOR_HAS_APPOINTMENTS`).
- **Horario:** lunes a viernes, de 09:00 a 18:00; el último turno empieza a las 17:30.

---

## 14. Estados contemplados

La interfaz contempla diferentes estados para proporcionar información clara al usuario:

- Cargando.
- Cita confirmada.
- Error de validación.
- Horario ocupado.
- Error de conexión.
- Lista vacía.
- Error al cancelar.
- Error al reagendar.
- Especialidad sin médico activo.
- Error al registrar un médico (la especialidad ya tiene un médico activo).
- Error al desactivar un médico (tiene citas próximas).

Los mensajes permiten identificar qué ocurrió y, cuando corresponde, ofrecen una acción para intentar nuevamente.

---

## 15. Problemas conocidos

Si el proyecto no inicia correctamente, revisar primero las versiones:

```bash
node --version
pnpm --version
docker --version
```

| Problema | Qué hacer |
|---|---|
| `pnpm: command not found` | Instalar pnpm con `npm install -g pnpm@12.6.0` (sección 4). |
| Error de versión de Node.js | Se necesita Node 22.12 o superior (recomendada la 24). |
| pnpm distinto de 12.6.0 o Corepack falla | No usar Corepack. Instalar con `npm install -g pnpm@12.6.0`. |
| `pnpm dev` falla o la API no responde en un clon limpio | Faltan los `.env` o la base de datos. Repetir los pasos de la sección 7: copiar los `.env`, `migrate deploy` y `db seed`. |
| Puerto 3000 o 3001 ocupado | Cerrar el proceso que lo usa. En local, el puerto de la API se cambia con `PORT` en `backend/.env`; en Docker, con `WEB_PORT` y `API_PORT`. Los E2E usan los puertos 3300 y 3301. |
| Playwright no encuentra el navegador | `pnpm --filter e2e exec playwright install chromium`. |
| `docker compose` no existe | Se requiere Docker Compose v2 (`docker compose`). La v1 (`docker-compose`) está descontinuada. |
| Se quieren reiniciar los datos de Docker | `docker compose down -v` borra los volúmenes; se vuelve a cargar el seed al levantar de nuevo. |

---

## 16. Mejoras futuras

Como posibles mejoras para futuras versiones se consideran:

- Autenticación y autorización de usuarios.
- Gestión de diferentes roles, como recepción, médico y administrador.
- Varios médicos por especialidad, con horarios y ausencias propios (la cita guardaría el médico).
- Paginación de las listas.
- Base de datos con múltiples escritores (por ejemplo PostgreSQL).
- Zona horaria configurable o según el paciente.
- Notificaciones por correo electrónico o WhatsApp.
- Recordatorios automáticos de citas.
- Historial médico asociado al paciente.
- Integración con calendarios externos.
- Mayor cantidad de métricas para el dashboard.
- Mejoras adicionales de accesibilidad.
- Automatización de despliegues y CI/CD.
- Ampliación de la cobertura de pruebas E2E.

Estas funcionalidades quedan fuera del alcance de la versión actual.

---

## 17. Flujo principal del sistema

```text
                    ┌──────────────────┐
                    │      Inicio      │
                    └────────┬─────────┘
                             │
                             ▼
                    Seleccionar fecha
                             │
                             ▼
                    Seleccionar horario
                             │
                             ▼
                    Completar formulario
                             │
                             ▼
                       Agendar cita
                             │
                   ┌─────────┴─────────┐
                   │                   │
                   ▼                   ▼
             Confirmación        Horario ocupado
                   │                   │
                   ▼                   ▼
                 /citas             Mostrar error
                   │
                   ▼
          Consultar / cancelar
                   │
                   ▼
             Cita cancelada
```

Para agendar, la especialidad debe tener un médico activo. Los médicos se gestionan desde `/medicos`.

---

## 18. Verificación desde cero

Antes de entregar el proyecto, un integrante que no haya participado directamente en la configuración debe realizar una instalación limpia siguiendo únicamente este README:

```bash
git clone https://github.com/garcia-bj/siam-agenda-medica.git
cd siam-agenda-medica
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
pnpm install
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec prisma db seed
pnpm dev
```

Después debe comprobar:

- La aplicación inicia correctamente (frontend en <http://localhost:3000>, API en <http://localhost:3001/api>).
- Puede acceder a la pantalla principal.
- Puede agendar una cita.
- Puede consultar `/citas`.
- Puede cancelar una cita.
- Puede acceder a `/medicos` y registrar un médico.
- No puede desactivar un médico con citas próximas.
- Puede acceder a `/dashboard` y descargar el informe en CSV o Excel.
- Las pruebas unitarias funcionan (`pnpm test`).
- Las pruebas E2E funcionan (`pnpm test:e2e`, tras instalar Chromium).

Si el integrante necesita instrucciones adicionales que no aparecen en este README, esas instrucciones deben incorporarse antes de la entrega final.

---

## 19. Estado del proyecto

El proyecto corresponde a una versión académica/prototipo de SIAM Agenda Médica desarrollada siguiendo una metodología de trabajo basada en historias de usuario y Pull Requests.

El alcance actual se centra en:

- Agendamiento de citas.
- Gestión de citas.
- Cancelación y reagendamiento.
- Gestión de médicos.
- Filtros.
- Dashboard de métricas e informes CSV/Excel.
- Diseño responsive.
- Pruebas automatizadas.
- Documentación para ejecución y evaluación.
