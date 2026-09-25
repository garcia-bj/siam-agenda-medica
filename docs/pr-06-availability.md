# PR-06: Consulta de Disponibilidad de Horarios (`feat/be-availability`)

Documentación técnica y funcional de lo implementado en el **PR-06**.

---

## 1. Historia de Usuario

> **Como** paciente,  
> **quiero** ver qué horarios están libres y cuáles ocupados en una fecha,  
> **para** elegir uno disponible.

---

## 2. Alcance y Criterios de Aceptación

### Criterios de Aceptación
1. **`GET /api/availability?date=2026-09-28`**: Devuelve los slots de las 4 especialidades con `available` correcto (72 slots en total, 18 por especialidad).
2. **`&specialty=PEDIATRIA`**: Con el parámetro opcional de especialidad, devuelve exclusivamente los 18 slots de Pediatría.
3. **Fines de semana**: Un sábado o domingo devuelve `200 OK` con `isBusinessDay: false` y `slots: []` (sin consultar la base de datos).
4. **Fechas inválidas**: Una fecha con formato o valor calendario inválido devuelve `400 VALIDATION_ERROR`.
5. **Slots en el pasado**: Los slots transcurridos en el día vienen con `available: false`. Un día pasado completo devuelve todos sus slots con `available: false`.
6. **Cruce de citas ocupadas**: Consulta única de citas `ACTIVE` del día cruzando en memoria con los slots generados. Las citas `CANCELLED` no ocupan el horario (`available: true`).

### Fuera de Alcance
- Reservar turnos (`POST /api/appointments`).

---

## 3. Arquitectura y Componentes Implementados

### A. DTO de Consulta ([`AvailabilityQueryDto`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/availability/dto/availability-query.dto.ts))
- `date`: Obligatorio (`@IsNotEmpty`), formato estricto `YYYY-MM-DD` (`@Matches(/^\d{4}-\d{2}-\d{2}$/)`).
- `specialty`: Opcional (`@IsOptional`), validado contra las 4 especialidades permitidas (`@IsIn(SPECIALTIES)`).
- Validación estricta con `ValidationPipe`: rechaza parámetros no permitidos con `400 VALIDATION_ERROR`.

### B. Servicio de Negocio ([`AvailabilityService`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/availability/availability.service.ts))
- **Verificación de día hábil**: Valida la fecha con Luxon en la zona `CLINIC_TZ` (`America/La_Paz`). Si es sábado o domingo, retorna inmediatamente `{ date, isBusinessDay: false, slots: [] }` sin tocar la base de datos.
- **Generación de grilla**: Utiliza `ScheduleService.generateSlots(date, specialty, now)` para generar la grilla base con slots de 30 min (09:00 a 17:30) y marcar slots pasados en `available: false`.
- **Consulta única a Base de Datos**: Ejecuta un único `prisma.appointment.findMany`:
  - Rango: `startTime >= startOfDay` y `startTime <= endOfDay` en la zona de la clínica.
  - Estado: `status: 'ACTIVE'`.
  - Filtro opcional por especialidad.
  - Selección optimizada de columnas (`specialty`, `startTime`).
- **Cruce en memoria $O(1)$**: Almacena las citas ocupadas en un `Set<string>` con clave `${specialty}|${isoStartTime}` y marca `slot.available = false` a los slots coincidentes.

### C. Controlador ([`AvailabilityController`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/availability/availability.controller.ts))
- Expone `GET /api/availability` bajo el prefijo global `/api`.
- Inyecta `AvailabilityService` y delega la ejecución de la consulta.

### D. Módulo ([`AvailabilityModule`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/availability/availability.module.ts))
- Importa `ScheduleModule` para tener acceso a `ScheduleService`.
- Declara `AvailabilityController` y provee/exporta `AvailabilityService`.

---

## 4. Contrato de la API

### Solicitud
```http
GET /api/availability?date=2026-09-28&specialty=PEDIATRIA
```

### Respuesta Exitosa (`200 OK`)
```json
{
  "date": "2026-09-28",
  "isBusinessDay": true,
  "slots": [
    {
      "specialty": "PEDIATRIA",
      "startTime": "2026-09-28T09:00:00-04:00",
      "endTime": "2026-09-28T09:30:00-04:00",
      "available": true
    },
    {
      "specialty": "PEDIATRIA",
      "startTime": "2026-09-28T09:30:00-04:00",
      "endTime": "2026-09-28T10:00:00-04:00",
      "available": false
    }
  ]
}
```

### Respuesta Fin de Semana (`200 OK`)
```json
{
  "date": "2026-09-26",
  "isBusinessDay": false,
  "slots": []
}
```

### Respuestas de Error (`400 VALIDATION_ERROR`)
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Datos inválidos",
  "details": [
    { "field": "date", "message": "La fecha debe tener formato YYYY-MM-DD" }
  ]
}
```

---

## 5. Pruebas y Cobertura

- **Pruebas Unitarias ([`availability.service.spec.ts`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/availability/availability.service.spec.ts) y [`availability.controller.spec.ts`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/availability/availability.controller.spec.ts))**:
  - Días no laborables (sábado/domingo sin invocar la BD).
  - Fechas calendario inválidas (`2026-02-31`).
  - Generación de 72 slots (4 especialidades) y 18 slots (con filtro).
  - Consulta única de citas `ACTIVE` con rango `startOfDay` - `endOfDay`.
  - Cruce de citas y preservación de `available: false` para slots pasados.

- **Pruebas E2E ([`backend/test/availability.e2e-spec.ts`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/test/availability.e2e-spec.ts))**:
  - 11 pruebas end-to-end con servidor HTTP y SQLite real.
  - Validación de códigos HTTP `200` y `400`.
  - Comprobación de ordenamiento de slots.
  - Comprobación de que citas `CANCELLED` no bloquean el turno.
