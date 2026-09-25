# PR-05: Reglas de Horario y Generación de Slots (`feat/be-schedule-rules`)

Documentación técnica y funcional de lo implementado en el **PR-05**.

---

## 1. Objetivo del PR

El propósito del PR-05 es implementar el **motor central de reglas de horario** de la clínica médica (`ScheduleService`) utilizando **Luxon**. Este módulo encapsula toda la lógica de dominio temporal y generación de grilla de turnos sin acoplamiento a la base de datos, sirviendo como fundamento para los módulos de Disponibilidad (`PR-06: feat/be-availability`) y Reservas (`PR-07: feat/be-appointments-reserve`).

---

## 2. Reglas de Negocio Implementadas

1. **Zona Horaria de la Clínica (`CLINIC_TZ`):**
   - Configurada vía variable de entorno `CLINIC_TZ` con valor por defecto `America/La_Paz` (UTC-4).
   - Se valida al instanciar el servicio con `IANAZone.isValidZone`. Si la zona es inválida, la aplicación falla inmediatamente al arrancar.
   - Todos los cálculos de turnos, inicio de día, fin de día y comparación con `now` se ejecutan en esta zona horaria, previniendo errores por desfases de medianoche UTC.

2. **Días Hábiles:**
   - Lunes a viernes son días de atención.
   - Sábados y domingos no son laborables. En fines de semana no se generan slots (`slots: []`) y no se permite agendar citas.

3. **Horario de Atención:**
   - De **09:00 a 18:00** hora local de la clínica.
   - Turnos fijos de **30 minutos** exactos (:00 y :30, sin segundos ni milisegundos).
   - Primer turno: `09:00 - 09:30`.
   - Último inicio permitido: `17:30` (el turno finaliza a las `18:00`).
   - Total por día hábil: **18 slots por especialidad** (72 slots en total para las 4 especialidades: `MEDICINA_GENERAL`, `PEDIATRIA`, `CARDIOLOGIA`, `DERMATOLOGIA`).

4. **Regla de Pasado (`now`):**
   - Regla de frontera estricta: un slot se considera pasado únicamente si `slotStart < now`.
   - Si `slotStart >= now`, el slot está en el presente/futuro y se considera disponible.

---

## 3. Métodos y API de `ScheduleService`

El servicio [`ScheduleService`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/schedule/schedule.service.ts) expone los siguientes métodos:

### `generateSlots(date: string, specialty?: Specialty, now?: DateTime | Date | string): Slot[]`
- Genera la grilla de slots para una fecha en formato `YYYY-MM-DD`.
- Si `specialty` es proporcionada, genera 18 slots únicamente para dicha especialidad; si se omite, genera los 72 slots ordenados cronológicamente y por especialidad.
- En sábado o domingo retorna un arreglo vacío `[]`.
- Marca cada slot con `available: false` si su inicio es anterior a `now`.
- Lanza `ApiException(400, 'VALIDATION_ERROR')` si la fecha o la especialidad son inválidas.

### `validateSlot(startTime: string | Date, now?: DateTime | Date | string): DateTime`
- Valida si un horario de inicio cumple con las reglas para ser agendado.
- Lanza `ApiException(422, 'OUTSIDE_BUSINESS_HOURS')` si:
  - Cae en fin de semana (sábado o domingo).
  - La fecha u hora está en el pasado (`startTime < now`).
  - Los minutos no son `:00` o `:30`, o contiene segundos/milisegundos.
  - Está fuera del rango comercial (antes de las 09:00 o después de las 17:30).
- Lanza `ApiException(400, 'VALIDATION_ERROR')` si el valor no es una fecha válida.
- Retorna el objeto `DateTime` normalizado en la zona de la clínica.

### `calculateEndTime(startTime: string | Date | DateTime): string`
- Calcula el fin del turno sumando 30 minutos a `startTime`.
- Retorna la fecha en formato ISO 8601 con offset (ej: `2026-09-28T09:30:00-04:00`).

### `isBusinessDay(date: string | Date | DateTime): boolean`
- Retorna `true` si la fecha corresponde a lunes–viernes en la zona de la clínica; `false` en caso contrario.

### `countBusinessDays(from: string, to: string): number`
- Cuenta la cantidad de días hábiles entre dos fechas `YYYY-MM-DD` inclusive.
- Lanza `ApiException(400, 'VALIDATION_ERROR')` si el rango es inválido o `from > to`.

---

## 4. Estructura de Datos (`Slot`)

```typescript
export interface Slot {
  specialty: Specialty; // 'MEDICINA_GENERAL' | 'PEDIATRIA' | 'CARDIOLOGIA' | 'DERMATOLOGIA'
  startTime: string;   // ISO 8601 con offset, ej: '2026-09-28T09:00:00-04:00'
  endTime: string;     // ISO 8601 con offset, ej: '2026-09-28T09:30:00-04:00'
  available: boolean;  // true si es presente/futuro
}
```

---

## 5. Códigos de Error HTTP

| Código | `code` | Motivo |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Formato de fecha inválido, rango `from > to` o especialidad inexistente. |
| `422` | `OUTSIDE_BUSINESS_HOURS` | Fuera de horario comercial (09:00–18:00), fin de semana, minutos no múltiplos de 30 o fecha/hora en el pasado. |

---

## 6. Archivos que Componen el PR

- [`backend/src/schedule/schedule.service.ts`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/schedule/schedule.service.ts): Implementación completa del servicio.
- [`backend/src/schedule/schedule.module.ts`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/schedule/schedule.module.ts): Módulo NestJS que provee y exporta `ScheduleService`.
- [`backend/src/schedule/schedule.service.spec.ts`](file:///c:/Users/mau69/Downloads/prd-citas-medicas/backend/src/schedule/schedule.service.spec.ts): Suite de 31 pruebas unitarias cubriendo generación de slots, validaciones, límites de `now`, medianoche UTC y manejo de errores.
