# Fix PR-05: Reglas de Horario (feat/be-schedule-rules)

Resolución de observaciones del Code Review para PR-05 (Reglas de horario).

---

## 1. Cambios realizados

### Cruce de medianoche UTC
- Se agregaron tests para asegurar que las fechas y horas se calculan siempre en la zona de la clínica (America/La_Paz) y no en UTC.
- Caso 1: Con now a las 20:30 del 2026-09-28 (en UTC ya es 2026-09-29T00:30:00Z):
  - generateSlots('2026-09-29') genera los 18 slots con available: true.
  - generateSlots('2026-09-28') genera los 18 slots con available: false por haber concluido el horario hábil.
- Caso 2: Validación de horas enviadas en UTC:
  - validateSlot('2026-10-02T21:30:00Z') corresponde a viernes 17:30 en La Paz y resulta válido.
  - validateSlot('2026-10-03T00:00:00Z') corresponde a viernes 20:00 en La Paz y responde 422 OUTSIDE_BUSINESS_HOURS.

### Límite exacto de now
- Se fijó la regla de frontera: un slot es considerado pasado cuando slotStart < now.
- Si un slot inicia exactamente en now (ej. 2026-09-28T09:00:00-04:00):
  - generateSlots lo marca con available: true.
  - validateSlot lo acepta sin error.
- Si se evalúa 1 segundo después (2026-09-28T09:00:01-04:00), el slot de las 09:00 pasa a available: false y validateSlot lanza 422 OUTSIDE_BUSINESS_HOURS.

### Aserción estricta de códigos y estados HTTP
- Se implementó el helper expectOutsideHours en los tests para comprobar explícitamente statusCode 422 y code: 'OUTSIDE_BUSINESS_HOURS'.
- Se utilizó it.each para verificar los horarios inválidos:
  - 08:30 (previo a horario de apertura 09:00)
  - 18:00 (posterior al último inicio permitido 17:30)
  - 09:15 (minutos distintos de :00 y :30)
  - 09:45 (minutos distintos de :00 y :30)
  - 09:30:15 (segundos distintos de cero)
- Se actualizaron las pruebas de error 400 para comprobar statusCode 400 y code: 'VALIDATION_ERROR'.

### Validación de CLINIC_TZ en ScheduleService
- En el constructor de ScheduleService se valida la zona horaria usando IANAZone.isValidZone.
- Si CLINIC_TZ contiene un valor inválido (ej. America/LaPaz), el servicio lanza un Error descriptivo al iniciar la aplicación.
- Se añadieron tests unitarios para verificar el fallo ante zonas inválidas y la aceptación de zonas IANA válidas.

### Limpieza de constantes
- Se eliminaron las constantes exportadas sin uso: BUSINESS_END_HOUR y SLOTS_PER_DAY_PER_SPECIALTY.

---

## 2. Archivos modificados

- backend/src/schedule/schedule.service.ts
- backend/src/schedule/schedule.service.spec.ts
- docs/fix-pr-05-schedule-rules.md

---

## 3. Verificación técnica

- Tests unitarios: 31 pruebas en schedule.service.spec.ts (57 pruebas en total en el backend, todas pasando).
- Linter (oxlint): 0 errores, 0 advertencias.
- Build (nest build): compilación exitosa.
