#SIAM Agenda Médica
Sistema web para la gestión y reserva de citas médicas. Permite consultar disponibilidad, agendar citas, visualizar las citas registradas, cancelar y reagendar citas, gestionar médicos y consultar métricas mediante un dashboard.

Índice
Descripción del proyecto

Tecnologías utilizadas

Requisitos previos

Instalar pnpm

Clonar el proyecto

Configuración de variables de entorno

Ejecutar el proyecto con Docker

Ejecutar el proyecto sin Docker

Funcionalidades principales

Ejecutar pruebas unitarias

Estructura del proyecto

Decisiones de diseño

Estados contemplados

Problemas conocidos

Mejoras futuras

Flujo principal del sistema

Verificación desde cero

Estado del proyecto

1. Descripción del proyecto
SIAM Agenda Médica busca facilitar la gestión de citas médicas mediante una interfaz web sencilla y responsive.

El sistema permite:

Consultar fechas y horarios disponibles.

Agendar una cita médica.

Visualizar las citas agendadas.

Filtrar citas por fecha y especialidad.

Cancelar una cita.

Reagendar una cita.

Registrar, editar, activar y desactivar médicos.

Consultar métricas de la agenda mediante un dashboard.

Validar errores de disponibilidad y conflictos de horarios.

Ejecutar pruebas unitarias y pruebas E2E del flujo principal.

Reglas de negocio
Atención de lunes a viernes, de 09:00 a 18:00, en bloques de 30 minutos.

No se pueden elegir fines de semana ni fechas pasadas.

Especialidades: Medicina General, Pediatría, Cardiología y Dermatología.

Cada especialidad tiene un solo médico activo. El paciente no elige médico: la cita se asigna al médico activo de la especialidad.

Si una especialidad no tiene médico activo, no se pueden agendar citas en ella.

Un médico con citas próximas no se puede desactivar.

Un horario ocupado no se puede reservar dos veces.

2. Tecnologías utilizadas
Frontend
Next.js

React

TypeScript

Tailwind CSS

Backend
NestJS

TypeScript

SQLite

Prisma ORM

Gestión del proyecto
pnpm

Git / GitHub

Docker

Testing
Jest

React Testing Library

Playwright

3. Requisitos previos
Antes de ejecutar el proyecto se necesita:

Git

Node.js

pnpm

Docker y Docker Desktop, únicamente si se desea utilizar la configuración con Docker.

Se recomienda utilizar una versión LTS de Node.js.

Instalar Node.js
Descargar Node.js desde su página oficial: Node.js

Comprobar la instalación:

Bash
node --version
npm --version
4. Instalar pnpm
Si pnpm no está instalado, puede instalarse mediante npm:

Bash
npm install -g pnpm
Comprobar la instalación:

Bash
pnpm --version
También puede instalarse mediante Corepack:

Bash
corepack enable
corepack prepare pnpm@latest --activate
Después comprobar:

Bash
pnpm --version
5. Clonar el proyecto
Clonar el repositorio:

Bash
git clone https://github.com/garcia-bj/siam-agenda-medica.git
Entrar al proyecto:

Bash
cd siam-agenda-medica
6. Configuración de variables de entorno
Antes de iniciar el proyecto se deben configurar las variables de entorno necesarias para el backend y frontend.
Crear los archivos .env correspondientes a partir de los archivos de ejemplo proporcionados por el proyecto.

Por ejemplo:

Bash
cp backend/.env.example backend/.env
Si el proyecto requiere variables adicionales para el frontend:

Bash
cp frontend/.env.example frontend/.env.local
Nota: No subir archivos .env con credenciales reales al repositorio.

7. Ejecutar el proyecto con Docker
Docker permite levantar los servicios necesarios mediante la configuración del proyecto.

Primero comprobar que Docker esté instalado:

Bash
docker --version
docker compose version
Desde la raíz del proyecto:

Bash
docker compose up --build
Una vez iniciados los servicios, acceder a: http://localhost:3000

Para detener los servicios:

Bash
docker compose down
Para detenerlos y eliminar los volúmenes asociados:

Bash
docker compose down -v
8. Ejecutar el proyecto sin Docker
Esta opción permite ejecutar el frontend y backend directamente con Node.js y pnpm.

Instalar dependencias (desde la raíz):

Bash
pnpm install
Iniciar el proyecto:

Bash
pnpm dev
El comando inicia los servicios configurados en el workspace:

Frontend: http://localhost:3000

Backend: http://localhost:3001

(Los puertos pueden variar según la configuración del proyecto).

9. Funcionalidades principales
Agendar una cita
Desde la pantalla principal:

Seleccionar la especialidad.

Seleccionar una fecha disponible.

Seleccionar un horario.

Completar los datos solicitados (nombre del paciente y email).

Confirmar la cita.

Verificar el mensaje de confirmación.

Si la especialidad no tiene un médico activo, la pantalla lo indica y pide elegir otra especialidad.

Consultar citas
Ingresar a /citas. La pantalla permite:

Visualizar las citas.

Consultar paciente, especialidad, médico, fecha y hora.

Filtrar por especialidad y por fecha, o limpiar los filtros.

Acceder a las acciones disponibles para cada cita.

(En escritorio las citas se muestran en formato de tabla y en dispositivos móviles se adaptan a tarjetas).

Cancelar una cita
Desde /citas:

Seleccionar una cita.

Presionar Cancelar.

Confirmar la acción.

Verificar el estado actualizado.

Reagendar una cita
Desde la cita correspondiente:

Seleccionar Reagendar.

Elegir una nueva fecha.

Seleccionar un horario disponible.

Confirmar el cambio.

Gestión de médicos
Ingresar a /medicos. La pantalla permite:

Ver el listado de médicos con su especialidad, estado (activo o inactivo) y cantidad de próximas citas.

Ver cuántos médicos hay activos e inactivos, y mostrar u ocultar los inactivos.

Ver qué especialidades no tienen médico activo.

Registrar un médico: Presionar Registrar médico, escribir el nombre completo, elegir la especialidad (la lista muestra qué médico está activo en cada una y cuáles no tienen médico) y confirmar. Solo puede haber un médico activo por especialidad.

Editar un médico: Presionar Editar en la fila del médico, modificar los datos y guardar los cambios.

Activar o desactivar un médico: Presionar Desactivar (o Activar) en la fila del médico. Un médico con citas próximas no se puede desactivar: primero hay que cancelar o reagendar esas citas. Al desactivar al único médico de una especialidad, esta deja de tener horarios para agendar hasta que se registre o active otro médico.

Dashboard
Ingresar a /dashboard. El dashboard permite consultar métricas relacionadas con la agenda, incluyendo información sobre:

Citas activas.

Promedio de citas.

Ocupación.

Cancelaciones.

Horarios más solicitados.

Distribución de citas.

También permite aplicar filtros de fechas y especialidad.

10. Ejecutar pruebas unitarias
Para ejecutar las pruebas unitarias:

Bash
pnpm test
Para ejecutar las pruebas en modo watch:

Bash
pnpm test:watch
Para obtener cobertura:

Bash
pnpm test:coverage
(Los comandos disponibles dependen de los scripts definidos en el package.json).

11. Estructura del proyecto
Plaintext
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
12. Decisiones de diseño
Un médico activo por especialidad: Cada especialidad tiene un solo médico activo, por lo que el paciente elige especialidad, fecha y horario, y no médico. Esto simplifica el flujo de reserva y la grilla de disponibilidad. La contrapartida es que no hay agendas paralelas dentro de una misma especialidad.

Integridad de la agenda al gestionar médicos: No se puede desactivar a un médico con citas próximas, para evitar citas huérfanas. Si una especialidad se queda sin médico activo, la interfaz lo indica en lugar de mostrar horarios que no se podrían atender.

Interfaz responsive: Se diseñó la interfaz considerando diferentes tamaños de pantalla (Móvil: ~375 px, Tablet: ~768 px, Escritorio: ~1280 px). En móvil se prioriza la visualización mediante tarjetas y controles accesibles, mientras que en escritorio se utiliza una distribución más amplia.

Reutilización de componentes: Se priorizó la reutilización de componentes existentes para evitar duplicación y mantener un comportamiento consistente (selección de días, disponibilidad de horarios, modales, tarjetas de citas, filtros, etc.).

Accesibilidad: Se utilizan elementos HTML semánticos, roles accesibles y etiquetas asociadas a los campos para facilitar la interacción con teclado y tecnologías de asistencia.

Selectores para pruebas: Las pruebas E2E utilizan roles accesibles y data-testid cuando es necesario para evitar depender de clases CSS o de la estructura interna del DOM.

13. Estados contemplados
La interfaz contempla diferentes estados para proporcionar información clara al usuario:

Cargando.

Cita confirmada.

Error de validación.

Horario ocupado.

Error de conexión.

Lista vacía.

Error al cancelar.

Error al reagendar.

Especialidad sin médico activo.

Especialidad que ya tiene un médico activo (al registrar o activar un médico).

Médico con citas próximas que no se puede desactivar.

Los mensajes permiten identificar qué ocurrió y, cuando corresponde, ofrecen una acción para intentar nuevamente.

14. Problemas conocidos
Actualmente pueden existir dependencias entre determinados servicios del proyecto para ejecutar correctamente el entorno local.
Si el proyecto no inicia correctamente, verificar primero:

node --version

pnpm --version

docker --version

Después comprobar que los archivos .env estén correctamente configurados.

15. Mejoras futuras
Como posibles mejoras para futuras versiones se consideran:

Autenticación y autorización de usuarios.

Gestión de diferentes roles, como recepción, médico y administrador.

Varios médicos por especialidad, con horarios y ausencias propios.

Notificaciones por correo electrónico o WhatsApp.

Recordatorios automáticos de citas.

Historial médico asociado al paciente.

Integración con calendarios externos.

Mayor cantidad de métricas para el dashboard y exportación de reportes.

Mejoras adicionales de accesibilidad.

Automatización de despliegues y CI/CD.

Ampliación de la cobertura de pruebas E2E.

16. Flujo principal del sistema
Plaintext
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
17. Verificación desde cero
Antes de entregar el proyecto, un integrante que no haya participado directamente en la configuración debe realizar una instalación limpia siguiendo únicamente este README:

Bash
git clone https://github.com/garcia-bj/siam-agenda-medica.git
cd siam-agenda-medica
pnpm install
pnpm dev
Después debe comprobar que:

La aplicación inicia correctamente.

Puede acceder a la pantalla principal.

Puede agendar una cita.

Puede consultar /citas.

Puede cancelar una cita.

Puede acceder a /medicos y registrar un médico.

Puede acceder a /dashboard.

Las pruebas unitarias funcionan.

Las pruebas E2E funcionan.

18. Estado del proyecto
El proyecto corresponde a una versión académica/prototipo de SIAM Agenda Médica desarrollada siguiendo una metodología de trabajo basada en historias de usuario y Pull Requests.

El alcance actual se centra en:

Agendamiento de citas.

Gestión de citas.

Gestión de médicos.

Cancelación y reagendamiento.

Filtros.

Dashboard de métricas.

Diseño responsive.

Pruebas automatizadas.

Documentación para ejecución y evaluación.
