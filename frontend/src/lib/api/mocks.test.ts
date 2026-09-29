import { describe, it, expect, vi } from 'vitest';
import { handleMock } from './mocks';
import { ApiRequestError } from './client';
import type { Appointment, AppointmentsResponse, AvailabilityResponse, Doctor, DoctorsResponse } from '@/types/api';

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

describe('mocks – /doctors', () => {
  // Módulo nuevo en cada test: el estado en memoria no se arrastra entre casos.
  async function freshMock() {
    vi.resetModules();
    return (await import('./mocks')).handleMock;
  }

  async function doctorOf(mock: typeof handleMock, specialty: string) {
    const { data } = await mock<DoctorsResponse>('/doctors', { method: 'GET' });
    return data.find((d) => d.specialty === specialty && d.active)!;
  }

  it('lists one active doctor per specialty', async () => {
    const mock = await freshMock();
    const { data } = await mock<DoctorsResponse>('/doctors', { method: 'GET' });
    expect(data.filter((d) => d.active).map((d) => d.specialty).sort()).toEqual(
      ['CARDIOLOGIA', 'DERMATOLOGIA', 'MEDICINA_GENERAL', 'PEDIATRIA'],
    );
  });

  it('blocks deactivating a doctor with upcoming appointments (409 DOCTOR_HAS_APPOINTMENTS)', async () => {
    const mock = await freshMock();
    await mock<Appointment>('/appointments', {
      method: 'POST',
      body: makeDto({ specialty: 'CARDIOLOGIA' }),
    });
    const cardio = await doctorOf(mock, 'CARDIOLOGIA');
    expect(cardio.upcomingAppointments).toBe(1);

    const err = await mock(`/doctors/${cardio.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    }).catch((e: unknown) => e);
    expect((err as ApiRequestError).code).toBe('DOCTOR_HAS_APPOINTMENTS');
  });

  it('allows one active doctor per specialty (409 SPECIALTY_HAS_DOCTOR)', async () => {
    const mock = await freshMock();
    const derma = await doctorOf(mock, 'DERMATOLOGIA');

    const taken = await mock('/doctors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA' }),
    }).catch((e: unknown) => e);
    expect((taken as ApiRequestError).code).toBe('SPECIALTY_HAS_DOCTOR');

    await mock(`/doctors/${derma.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) });
    const created = await mock<Doctor>('/doctors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA' }),
    });
    expect(created.active).toBe(true);

    const reactivate = await mock(`/doctors/${derma.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: true }),
    }).catch((e: unknown) => e);
    expect((reactivate as ApiRequestError).code).toBe('SPECIALTY_HAS_DOCTOR');
  });
});
