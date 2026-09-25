import { describe, it, expect } from 'vitest';
import { handleMock } from './mocks';
import { ApiRequestError } from './client';
import type { Appointment, AppointmentsResponse, AvailabilityResponse } from '@/types/api';

const FUTURE_DATE = '2027-01-15'; // Friday

function makeDto(overrides: Partial<{
  patientName: string;
  patientEmail: string;
  specialty: string;
  startTime: string;
}> = {}) {
  return JSON.stringify({
    patientName: 'Paciente Test',
    patientEmail: 'test@correo.com',
    specialty: 'MEDICINA_GENERAL',
    startTime: `${FUTURE_DATE}T10:00:00-04:00`,
    ...overrides,
  });
}

describe('mocks – POST /appointments', () => {
  it('creates an appointment and it appears in list', async () => {
    const created = await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: `${FUTURE_DATE}T11:00:00-04:00`, specialty: 'DERMATOLOGIA' }),
    });
    expect(created.patientName).toBe('Paciente Test');

    const res = await handleMock<AppointmentsResponse>('/appointments', { method: 'GET' });
    expect(res.data.some((a) => a.id === created.id)).toBe(true);
  });

  it('returns 409 SLOT_TAKEN when same slot is booked twice — independent', async () => {
    const slot = `${FUTURE_DATE}T12:00:00-04:00`;
    await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: slot, specialty: 'PEDIATRIA', patientName: 'Primero' }),
    });

    try {
      await handleMock<Appointment>('/appointments', {
        method: 'POST',
        body: makeDto({ startTime: slot, specialty: 'PEDIATRIA', patientName: 'Segundo' }),
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('SLOT_TAKEN');
        expect(error.message).toContain('Pediatría');
      }
    }
  });
});

describe('mocks – DELETE /appointments/:id', () => {
  it('frees slot after cancellation so it can be rebooked', async () => {
    const created = await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: `${FUTURE_DATE}T13:00:00-04:00`, specialty: 'CARDIOLOGIA' }),
    });

    await handleMock<void>(`/appointments/${created.id}`, { method: 'DELETE' });

    const listRes = await handleMock<AppointmentsResponse>('/appointments?status=CANCELLED', { method: 'GET' });
    const cancelled = listRes.data.find((a) => a.id === created.id);
    expect(cancelled?.status).toBe('CANCELLED');
    expect(cancelled?.cancelledAt).toBeTruthy();

    // slot should now be free — rebooking must succeed
    const created2 = await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: `${FUTURE_DATE}T13:00:00-04:00`, specialty: 'CARDIOLOGIA', patientName: 'Otro' }),
    });
    expect(created2.id).not.toBe(created.id);
  });

  it('returns 409 ALREADY_CANCELLED when cancelling twice', async () => {
    const created = await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: `${FUTURE_DATE}T14:00:00-04:00`, specialty: 'MEDICINA_GENERAL', patientName: 'DobleCancel' }),
    });
    await handleMock<void>(`/appointments/${created.id}`, { method: 'DELETE' });

    try {
      await handleMock<void>(`/appointments/${created.id}`, { method: 'DELETE' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('ALREADY_CANCELLED');
      }
    }
  });
});

describe('mocks – PATCH /appointments/:id', () => {
  it('returns 409 when rescheduling to a taken slot', async () => {
    const slot1 = `${FUTURE_DATE}T15:00:00-04:00`;
    const slot2 = `${FUTURE_DATE}T15:30:00-04:00`;

    await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: slot1, specialty: 'MEDICINA_GENERAL', patientName: 'A' }),
    });
    const b = await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: slot2, specialty: 'MEDICINA_GENERAL', patientName: 'B' }),
    });

    try {
      await handleMock<Appointment>(`/appointments/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ startTime: slot1 }),
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('SLOT_TAKEN');
      }
    }
  });

  it('returns 404 for unknown id', async () => {
    try {
      await handleMock<Appointment>('/appointments/non-existent-id', {
        method: 'PATCH',
        body: JSON.stringify({ startTime: `${FUTURE_DATE}T09:00:00-04:00` }),
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('La cita no existe');
      }
    }
  });
});

describe('mocks – GET /appointments', () => {
  it('default status=ACTIVE does not return cancelled appointments', async () => {
    const created = await handleMock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ startTime: `${FUTURE_DATE}T16:00:00-04:00`, specialty: 'DERMATOLOGIA', patientName: 'ToCancel' }),
    });
    await handleMock<void>(`/appointments/${created.id}`, { method: 'DELETE' });

    const res = await handleMock<AppointmentsResponse>('/appointments', { method: 'GET' });
    const found = res.data.find((a) => a.id === created.id);
    expect(found).toBeUndefined();
  });
});

describe('mocks – GET /availability', () => {
  it('returns isBusinessDay: false for a Saturday', async () => {
    const saturday = '2027-01-16';
    const res = await handleMock<AvailabilityResponse>(`/availability?date=${saturday}`, { method: 'GET' });
    expect(res.isBusinessDay).toBe(false);
    expect(res.slots).toHaveLength(0);
  });
});
