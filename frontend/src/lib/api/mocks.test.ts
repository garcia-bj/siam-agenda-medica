import { describe, it, expect, beforeEach } from 'vitest';
import { handleMock } from './mocks';
import { ApiRequestError } from './client';

describe('mocks', () => {
  it('creates an appointment and lists it', async () => {
    const body = JSON.stringify({
      patientName: 'Test Patient',
      patientEmail: 'test@correo.com',
      specialty: 'MEDICINA_GENERAL',
      startTime: '2026-09-29T10:00:00-04:00',
    });

    const created = await handleMock<any>('/appointments', { method: 'POST', body });
    expect(created.patientName).toBe('Test Patient');

    const res = await handleMock<any>('/appointments', { method: 'GET' });
    expect(res.data.some((a: any) => a.id === created.id)).toBe(true);
  });

  it('returns 409 when slot is taken', async () => {
    const body = JSON.stringify({
      patientName: 'Test 2',
      patientEmail: 't2@correo.com',
      specialty: 'MEDICINA_GENERAL',
      startTime: '2026-09-29T10:00:00-04:00', // same as previous
    });

    try {
      await handleMock<any>('/appointments', { method: 'POST', body });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('SLOT_TAKEN');
      }
    }
  });

  it('frees slot after cancellation', async () => {
    // create one to cancel
    const created = await handleMock<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientName: 'Test 3',
        patientEmail: 't3@correo.com',
        specialty: 'CARDIOLOGIA',
        startTime: '2026-09-30T10:00:00-04:00',
      })
    });

    // cancel it
    await handleMock<any>(`/appointments/${created.id}`, { method: 'DELETE' });

    // listing shows it as cancelled
    const listRes = await handleMock<any>('/appointments?status=CANCELLED', { method: 'GET' });
    const cancelledAppt = listRes.data.find((a: any) => a.id === created.id);
    expect(cancelledAppt).toBeDefined();
    expect(cancelledAppt.status).toBe('CANCELLED');

    // creating again at same time should work
    const created2 = await handleMock<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientName: 'Test 4',
        patientEmail: 't4@correo.com',
        specialty: 'CARDIOLOGIA',
        startTime: '2026-09-30T10:00:00-04:00',
      })
    });
    
    expect(created2).toBeDefined();
  });
});
