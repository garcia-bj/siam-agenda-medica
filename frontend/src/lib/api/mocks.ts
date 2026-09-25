import type {
  Appointment,
  AppointmentsResponse,
  AvailabilityResponse,
  Slot,
  Specialty,
  SPECIALTIES,
} from '@/types/api';

const CLINIC_SPECIALTIES: Specialty[] = [
  'MEDICINA_GENERAL',
  'PEDIATRIA',
  'CARDIOLOGIA',
  'DERMATOLOGIA',
];

const HOURS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

function randomId(): string {
  return crypto.randomUUID();
}

function isWeekend(date: string): boolean {
  const d = new Date(`${date}T12:00:00`);
  return d.getDay() === 0 || d.getDay() === 6;
}

export function mockAvailability(
  date: string,
  specialty?: Specialty,
): AvailabilityResponse {
  if (isWeekend(date)) {
    return { date, isBusinessDay: false, slots: [] };
  }

  const specs = specialty
    ? [specialty]
    : CLINIC_SPECIALTIES;

  const slots: Slot[] = [];

  for (const hour of HOURS) {
    for (const spec of specs) {
      slots.push({
        specialty: spec,
        startTime: `${date}T${hour}:00-04:00`,
        endTime: `${date}T${nextHalf(hour)}:00-04:00`,
        available: Math.random() > 0.3,
      });
    }
  }

  return { date, isBusinessDay: true, slots };
}

function nextHalf(hour: string): string {
  const [h, m] = hour.split(':').map(Number);
  if (m === 30) return `${String(h + 1).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:30`;
}

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: randomId(),
    patientName: 'Carlos Méndez',
    patientEmail: 'carlos@correo.com',
    specialty: 'MEDICINA_GENERAL',
    startTime: '2026-09-28T10:30:00-04:00',
    endTime: '2026-09-28T11:00:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T08:00:00-04:00',
  },
  {
    id: randomId(),
    patientName: 'Lucía Rojas',
    patientEmail: 'lucia@correo.com',
    specialty: 'DERMATOLOGIA',
    startTime: '2026-09-29T09:00:00-04:00',
    endTime: '2026-09-29T09:30:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T09:15:00-04:00',
  },
  {
    id: randomId(),
    patientName: 'Jorge Molina',
    patientEmail: 'jorge@correo.com',
    specialty: 'MEDICINA_GENERAL',
    startTime: '2026-09-29T14:30:00-04:00',
    endTime: '2026-09-29T15:00:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T10:30:00-04:00',
  },
  {
    id: randomId(),
    patientName: 'Valeria Rivera',
    patientEmail: 'valeria@correo.com',
    specialty: 'CARDIOLOGIA',
    startTime: '2026-09-30T11:00:00-04:00',
    endTime: '2026-09-30T11:30:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T11:00:00-04:00',
  },
  {
    id: randomId(),
    patientName: 'Elena Pérez',
    patientEmail: 'elena@correo.com',
    specialty: 'DERMATOLOGIA',
    startTime: '2026-10-01T16:00:00-04:00',
    endTime: '2026-10-01T16:30:00-04:00',
    status: 'CANCELLED',
    cancelledAt: '2026-09-26T12:00:00-04:00',
    createdAt: '2026-09-25T12:00:00-04:00',
  },
];

export function mockAppointments(): AppointmentsResponse {
  return { data: MOCK_APPOINTMENTS };
}
