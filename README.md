# SIAM – Sistema de Agenda Médica
Aplicación web para agendar, reprogramar y cancelar citas médicas, con gestión de médicos y un dashboard de métricas.

---

## Índice

1. [Qué hace](#1-qué-hace)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Requisitos previos](#3-requisitos-previos)
4. [Cómo ejecutarlo](#4-cómo-ejecutarlo)
   - [Opción A: con Docker](#opción-a-con-docker)
   - [Opción B: sin Docker (pnpm)](#opción-b-sin-docker-pnpm)
5. [Tests](#5-tests)
6. [Estructura del proyecto](#6-estructura-del-proyecto)
7. [Decisiones de diseño](#7-decisiones-de-diseño)
8. [Mejoras futuras](#8-mejoras-futuras)
9. [Solución de problemas](#9-solución-de-problemas)

---

## 1. Qué hace

| Vista | Ruta | Para qué sirve |
|---|---|---|
| **Vista 1 · Agendar cita** | `TODO /` | Elegir especialidad, fecha y horario libre, y confirmar con nombre y email del paciente. |
| **Vista 2 · Citas agendadas** | `TODO /citas` | Listar citas activas ordenadas por fecha y hora, filtrar por especialidad y fecha, reprogramar o cancelar. |
| Médicos | `TODO /medicos` | Registrar, editar, activar y desactivar médicos. |
| Dashboard | `TODO /dashboard` | Métricas de la agenda (citas activas, ocupación, cancelaciones, hora pico). La descarga de reportes es **Fase 2**. |

**Reglas de negocio**

- Atención de lunes a viernes, de 09:00 a 18:00, en bloques de 30 minutos.
- No se pueden elegir fines de semana ni fechas pasadas.
- Especialidades: Medicina General, Pediatría, Cardiología y Dermatología.
- Hay **un solo médico activo por especialidad**. Sin médico activo, la especialidad no tiene horarios para agendar.
- Un médico con citas próximas no se puede desactivar.
- Un horario ocupado no se puede reservar dos veces: si otra persona lo toma primero, la API responde `409` y la grilla se actualiza.

---

## 2. Tecnologías utilizadas

| Área | Tecnologías |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS |
| **Backend** | NestJS, TypeScript, SQLite, Prisma ORM |
| **Gestión del proyecto** | pnpm, Git / GitHub, Docker |
| **Testing** | Jest, React Testing Library, Playwright |

---

## 3. Requisitos previos

Antes de ejecutar el proyecto se necesita:

- Git
- Node.js
- pnpm
- Docker y Docker Desktop, únicamente si se desea utilizar la configuración con Docker.

Se recomienda utilizar una versión LTS de Node.js.

### Instalar Node.js

Descargar Node.js desde su página oficial: [Node.js](https://nodejs.org/)

Comprobar la instalación:

```bash
node --version
npm --version
```

### Instalar pnpm

Comprueba si ya lo tienes:

```bash
pnpm --version
```

Si no, instálalo con una de estas formas:

```bash
# Recomendada: Corepack (viene con Node.js)
corepack enable
corepack prepare pnpm@latest --activate

# Alternativa: con npm
npm install -g pnpm
```

Otras formas de instalación: <https://pnpm.io/installation>

---

## 4. Cómo ejecutarlo

Primero clona el repositorio:

```bash
git clone TODO-url-del-repo
cd TODO-nombre-del-repo
```

### Opción A: con Docker

```bash
docker compose up --build
```

<!-- TODO: verificar el comando y si hace falta copiar un .env (cp .env.example .env). -->

Cuando termine de construir, abre <http://localhost:TODO-puerto>.

Para detenerlo: `Ctrl + C` y luego `docker compose down`.

### Opción B: sin Docker (pnpm)

```bash
pnpm install
pnpm dev
```

<!-- TODO: si hay variables de entorno, documentar: cp .env.example .env -->

Abre <http://localhost:TODO-puerto>.

Si el proyecto tiene backend y frontend por separado, indica aquí cómo levantar cada uno (`TODO`).

---

## 5. Tests

Con las dependencias ya instaladas (`pnpm install`):

```bash
# Tests unitarios
pnpm test

# Tests E2E
pnpm test:e2e
```

<!-- TODO: confirmar los nombres reales de los scripts en package.json. -->

**Antes del primer E2E**, instala los navegadores de la herramienta usada (`TODO`, ej. Playwright):

```bash
pnpm exec playwright install
```

Los E2E `TODO necesitan / no necesitan` que la app esté corriendo antes. `TODO explicar`.

---

## 6. Estructura del proyecto

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
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

- `backend/`: API del proyecto.
- `frontend/`: interfaz web.
- `e2e/`: tests end-to-end con Playwright.
- `pnpm-workspace.yaml`: define el monorepo; `pnpm install` en la raíz instala las dependencias de todos los paquetes.
- `docker-compose.yml`: levanta el proyecto con Docker.

---

## 7. Decisiones de diseño

**Producto**

- **Un médico activo por especialidad.** Simplifica la agenda: la especialidad determina el médico y el paciente no tiene que elegirlo. El costo es que no hay agenda paralela por especialidad.
- **Bloques fijos de 30 minutos, lunes a viernes.** Una grilla única y predecible evita solapamientos y hace trivial calcular ocupación.
- **Conflictos resueltos en el servidor (`409`).** La disponibilidad que ve el usuario puede quedar vieja; el servidor es quien decide. Ante un `409` la UI recarga la grilla y pide elegir otro horario.
- **Cancelar libera el horario.** La cita cancelada deja de contar como activa, pero se conserva para las métricas de cancelación.
- **Confirmación antes de acciones destructivas.** Cancelar exige un modal de confirmación; reprogramar muestra la cita actual y el resumen del cambio.
- **Estados explícitos en la UI.** Validación por campo, carga, error de red con reintento, lista vacía y confirmación. Están diseñados como parte del flujo, no como casos de borde.
- **Responsive.** Las dos vistas principales tienen versión móvil.

**Técnicas**

<!-- TODO: completar con las decisiones reales del equipo. Sugerencias de qué cubrir, con el "por qué" y el trade-off de cada una:
- Framework / lenguaje del frontend y del backend
- Persistencia (base de datos, en memoria, archivo)
- Cómo se evita la doble reserva (restricción única, transacción, lock)
- Manejo de zonas horarias y fechas
- Validación (cliente y servidor)
- Estrategia de tests (qué cubre unit y qué cubre E2E)
- Por qué pnpm y por qué Docker
-->

---

## 8. Mejoras futuras

- **Descarga de reportes (Fase 2):** exportar citas por rango, especialidad y estado (columnas: paciente, email, especialidad, fecha, hora de inicio y fin, estado y fecha de creación).
- Autenticación y roles (paciente, recepción, administrador).
- Notificaciones por email al confirmar, reprogramar o cancelar.
- Varios médicos por especialidad, con horarios y ausencias propios.
- Duración de cita configurable y horarios de atención por médico.
- Actualización de disponibilidad en tiempo real (WebSocket o SSE) para reducir los `409`.
- Internacionalización y manejo de zona horaria del paciente.
- `TODO` otras deudas técnicas conocidas.

---

## 9. Solución de problemas

| Problema | Qué hacer |
|---|---|
| `pnpm: command not found` | Instala pnpm (sección 3). Si usaste Corepack, abre una terminal nueva. |
| El puerto `TODO` está ocupado | Cierra el proceso que lo usa o cambia el puerto en `TODO archivo`. |
| `docker compose` no existe | Actualiza Docker o usa `docker-compose` (v1). |
| Los E2E no encuentran el navegador | Ejecuta `pnpm exec playwright install`. `TODO ajustar a la herramienta real` |
