# SIAM – Contrato de la API

> Fuente de verdad del contrato entre frontend y backend. Solo cambia con un PR propio y avisando al equipo.
> `frontend/src/types/api.ts` tiene que coincidir exactamente con este documento.

## Convenciones

- Base: `http://localhost:3001/api`. Todo es JSON salvo la descarga de reportes.
- **Fecha y hora** (`startTime`, `endTime`, `createdAt`, `cancelledAt`): ISO 8601 con desfase, en la zona de la clínica. Ejemplo: `2026-09-28T09:00:00-04:00`. El backend acepta cualquier desfase válido y lo guarda en UTC.
- **Día** (`date`, `from`, `to`): `YYYY-MM-DD`, interpretado como día calendario en `CLINIC_TZ` (`America/La_Paz`). Los rangos `from`–`to` **incluyen los dos extremos**.
- Especialidades: `MEDICINA_GENERAL`, `PEDIATRIA`, `CARDIOLOGIA`, `DERMATOLOGIA`.
- Estados de una cita: `ACTIVE`, `CANCELLED`.
- Horario de atención: lunes a viernes, 09:00 a 18:00 en `CLINIC_TZ`, bloques de 30 min (el último empieza 17:30). 18 slots por día y especialidad.
- Un parámetro de query desconocido o con valor inválido responde `400 VALIDATION_ERROR`.

## Resumen

| Método | Ruta | Uso | Éxito | Errores |
| --- | --- | --- | --- | --- |
| GET | `/health` | Salud del servicio | 200 | – |
| GET | `/availability` | Slots de un día | 200 | 400 |
| POST | `/appointments` | Reservar | 201 | 400, 409, 422 |
| GET | `/appointments` | Listar con filtros | 200 | 400 |
| PATCH | `/appointments/:id` | Reprogramar | 200 | 400, 404, 409, 422 |
| DELETE | `/appointments/:id` | Cancelar (soft delete) | 204 | 404, 409 |
| GET | `/metrics/summary` | Métricas del dashboard | 200 | 400 |
| GET | `/reports/appointments` | Descargar CSV o Excel | 200 (archivo) | 400 |

## Errores

Todos los errores, en todos los endpoints (incluida una ruta inexistente), tienen esta forma:

```json
{
  "statusCode": 409,
  "code": "SLOT_TAKEN",
  "message": "El horario ya está ocupado para Pediatría",
  "details": []
}
```

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Campos o parámetros faltantes, de más o inválidos. `details` trae uno por campo |
| 404 | `NOT_FOUND` | La cita no existe, o la ruta no existe |
| 409 | `SLOT_TAKEN` | Ya hay una cita activa en esa especialidad a esa hora |
| 409 | `ALREADY_CANCELLED` | Reprogramar o cancelar una cita ya cancelada |
| 422 | `OUTSIDE_BUSINESS_HOURS` | Fin de semana, fuera de 09:00–18:00, minutos distintos de 00/30, o fecha/hora pasada |
| 500 | `INTERNAL_ERROR` | Error inesperado. `message` es genérico; el detalle solo queda en el log del servidor |

`details` es un arreglo (vacío si no aplica):

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Datos inválidos",
  "details": [
    { "field": "patientEmail", "message": "Debe ser un email válido" },
    { "field": "patientName", "message": "Debe tener entre 2 y 100 caracteres" }
  ]
}
```

## Objeto `Appointment`

```json
{
  "id": "5b0c1f3e-8a7d-4a51-9f59-2f4f0b8f3a10",
  "patientName": "Ana Pérez",
  "patientEmail": "ana@correo.com",
  "specialty": "PEDIATRIA",
  "startTime": "2026-09-28T09:00:00-04:00",
  "endTime": "2026-09-28T09:30:00-04:00",
  "status": "ACTIVE",
  "cancelledAt": null,
  "createdAt": "2026-09-25T14:12:03-04:00"
}
```

---

## GET /health

Respuesta `200`:

```json
{ "status": "ok" }
```

## GET /availability

| Parámetro | Obligatorio | Valor |
| --- | --- | --- |
| `date` | Sí | `YYYY-MM-DD` |
| `specialty` | No | Una especialidad. Sin él, devuelve las 4 |

Respuesta `200`:

```json
{
  "date": "2026-09-28",
  "isBusinessDay": true,
  "slots": [
    { "specialty": "MEDICINA_GENERAL", "startTime": "2026-09-28T09:00:00-04:00", "endTime": "2026-09-28T09:30:00-04:00", "available": true },
    { "specialty": "PEDIATRIA", "startTime": "2026-09-28T09:00:00-04:00", "endTime": "2026-09-28T09:30:00-04:00", "available": false }
  ]
}
```

- `slots` va ordenado por `startTime` y, dentro de la misma hora, por especialidad en este orden: `MEDICINA_GENERAL`, `PEDIATRIA`, `CARDIOLOGIA`, `DERMATOLOGIA`.
- 18 slots con `specialty`, 72 sin ella.
- Sábado o domingo: `200` con `isBusinessDay: false` y `slots: []`.
- Un slot ya ocupado o que empieza en el pasado tiene `available: false`. Un día pasado completo devuelve todos sus slots con `available: false`.
- Errores: `400` si falta `date`, tiene otro formato o `specialty` no es válida.

## POST /appointments

Body:

```json
{
  "patientName": "Ana Pérez",
  "patientEmail": "ana@correo.com",
  "specialty": "PEDIATRIA",
  "startTime": "2026-09-28T09:00:00-04:00"
}
```

| Campo | Regla |
| --- | --- |
| `patientName` | Texto de 2 a 100 caracteres (se recortan espacios al inicio y al final) |
| `patientEmail` | Email válido |
| `specialty` | Una de las 4 especialidades |
| `startTime` | ISO 8601 con desfase. L-V, 09:00–17:30, minutos 00 o 30, en el futuro |

`endTime` lo calcula el backend (`startTime` + 30 min). Un campo que no está en la tabla responde `400`.

Respuesta `201`: el `Appointment` creado.

Errores: `400 VALIDATION_ERROR`, `409 SLOT_TAKEN`, `422 OUTSIDE_BUSINESS_HOURS`.

## GET /appointments

| Parámetro | Obligatorio | Valor |
| --- | --- | --- |
| `specialty` | No | Una especialidad |
| `date` | No | `YYYY-MM-DD`: citas cuyo `startTime` cae ese día en `CLINIC_TZ` |
| `status` | No | `ACTIVE` (por defecto), `CANCELLED` o `ALL` |

Respuesta `200`, ordenada por `startTime` ascendente:

```json
{ "data": [ { "id": "…", "status": "ACTIVE", "…": "…" } ] }
```

Sin paginación (alcance de la prueba). Errores: `400` si algún filtro es inválido.

## PATCH /appointments/:id

Reprograma una cita a otro horario **de la misma especialidad**.

Body:

```json
{ "startTime": "2026-09-29T10:30:00-04:00" }
```

- Solo se acepta `startTime`. Mandar `specialty`, `patientName` u otro campo responde `400`.
- Mismas reglas de horario que al crear.
- Reprogramar al mismo horario que ya tiene responde `200` sin cambios.

Respuesta `200`: el `Appointment` actualizado (con el nuevo `endTime`).

Errores: `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `409 SLOT_TAKEN`, `409 ALREADY_CANCELLED`, `422 OUTSIDE_BUSINESS_HOURS`.

## DELETE /appointments/:id

Cancelación suave: `status` pasa a `CANCELLED` y se guarda `cancelledAt`. El slot vuelve a quedar libre.

Respuesta `204` sin cuerpo.

Errores: `404 NOT_FOUND`, `409 ALREADY_CANCELLED`.

## GET /metrics/summary

| Parámetro | Obligatorio | Valor |
| --- | --- | --- |
| `from` | No | `YYYY-MM-DD`. Por defecto, el lunes de la semana actual |
| `to` | No | `YYYY-MM-DD`, incluido. Por defecto, el viernes de la semana actual |
| `specialty` | No | Una especialidad |

- `from` no puede ser posterior a `to`, y el rango es de 92 días como máximo (`400` si no).
- Cuenta las citas cuyo `startTime` cae en el rango (en `CLINIC_TZ`).

Respuesta `200`:

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

- `capacity` = días hábiles × 18 × especialidades incluidas (4, o 1 si viene `specialty`).
- `occupancyRate` = `active` / `capacity`; `cancellationRate` = `cancelled` / (`active` + `cancelled`). Vale 0 si el divisor es 0. Redondeo a 3 decimales.
- `bySpecialty`: una fila por especialidad incluida (4, o 1), en el orden de las especialidades.
- `byDay`: una fila por **día hábil** del rango, aunque tenga ceros.
- `byHour`: 9 filas, de `09:00` a `17:00`; agrupa por la hora de inicio (09:00 y 09:30 caen en `09:00`). Solo citas activas.

## GET /reports/appointments

| Parámetro | Obligatorio | Valor |
| --- | --- | --- |
| `from` | No | Igual que en métricas |
| `to` | No | Igual que en métricas |
| `specialty` | No | Una especialidad |
| `status` | No | `ACTIVE`, `CANCELLED` o `ALL` (por defecto `ALL`) |
| `format` | No | `csv` (por defecto) o `xlsx` |

Respuesta `200` con el archivo:

- `Content-Type`: `text/csv; charset=utf-8` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- `Content-Disposition: attachment; filename="siam-citas_2026-09-28_2026-10-02.csv"`, expuesto por CORS (`exposedHeaders`).
- Columnas: ID, Paciente, Email, Especialidad, Fecha, Hora inicio, Hora fin, Estado, Creada. Fechas y horas en `CLINIC_TZ`; especialidad y estado en español (`Pediatría`, `Activa`, `Cancelada`).
- Orden por `startTime` ascendente.
- CSV en UTF-8 con BOM y separado por comas; Excel con encabezados en negrita.

Errores: mismos `400` que en métricas, más `format` o `status` inválidos. Los errores se devuelven en JSON, no como archivo.
