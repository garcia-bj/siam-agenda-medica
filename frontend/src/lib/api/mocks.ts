import type {
  Appointment,
  AvailabilityResponse,
  Slot,
  Specialty,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from '@/types/api';
import { ApiRequestError } from './client';

const CLINIC_SPECIALTIES: Specialty[] = [
  'MEDICINA_GENERAL',
  'PEDIATRIA',
  'CARDIOLOGIA',
  'DERMATOLOGIA',
];

const SPECIALTY_LABELS: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

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

function nextHalf(hour: string): string {
  const [h, m] = hour.split(':').map(Number);
  if (m === 30) return `${String(h + 1).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:30`;
}

// In-memory state — const because the reference never changes, only the contents
const appointments: Appointment[] = [
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
  }
];

function checkSlotTaken(specialty: Specialty, startTime: string, excludeId?: string): boolean {
  return appointments.some(a => 
    a.specialty === specialty && 
    a.startTime === startTime && 
    a.status === 'ACTIVE' &&
    a.id !== excludeId
  );
}

function getAvailability(date: string, specialty?: Specialty): AvailabilityResponse {
  if (isWeekend(date)) {
    return { date, isBusinessDay: false, slots: [] };
  }

  const specs = specialty ? [specialty] : CLINIC_SPECIALTIES;
  const slots: Slot[] = [];
  const now = new Date(); // In a real app we'd compare against CLINIC_TZ, using system time for mock

  for (const hour of HOURS) {
    for (const spec of specs) {
      const startTime = `${date}T${hour}:00-04:00`;
      const slotTime = new Date(startTime);
      const isPast = slotTime < now;
      const taken = checkSlotTaken(spec, startTime);
      
      slots.push({
        specialty: spec,
        startTime,
        endTime: `${date}T${nextHalf(hour)}:00-04:00`,
        available: !isPast && !taken,
      });
    }
  }

  return { date, isBusinessDay: true, slots };
}

async function delay() {
  const ms = Math.floor(Math.random() * 300) + 300; // 300-600ms
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleMock<T>(path: string, options: RequestInit): Promise<T> {
  await delay();

  const method = options.method || 'GET';
  const url = new URL(path, 'http://localhost');

  if (url.pathname === '/availability' && method === 'GET') {
    const date = url.searchParams.get('date');
    const specialty = url.searchParams.get('specialty') as Specialty | null;
    if (!date) throw new ApiRequestError(400, 'VALIDATION_ERROR', 'date is required', []);
    return getAvailability(date, specialty ?? undefined) as unknown as T;
  }

  if (url.pathname === '/appointments' && method === 'GET') {
    let result = [...appointments];
    const status = url.searchParams.get('status') || 'ACTIVE';
    if (status !== 'ALL') {
      result = result.filter(a => a.status === status);
    }
    const specialty = url.searchParams.get('specialty');
    if (specialty) result = result.filter(a => a.specialty === specialty);
    const date = url.searchParams.get('date');
    if (date) result = result.filter(a => a.startTime.startsWith(date));

    result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return { data: result } as unknown as T;
  }

  if (url.pathname === '/appointments' && method === 'POST') {
    const body = JSON.parse(options.body as string) as CreateAppointmentDto;
    if (checkSlotTaken(body.specialty, body.startTime)) {
      throw new ApiRequestError(409, 'SLOT_TAKEN', `El horario ya está ocupado para ${SPECIALTY_LABELS[body.specialty]}`, []);
    }
    const endHour = nextHalf(body.startTime.substring(11, 16));
    const newAppt: Appointment = {
      id: randomId(),
      ...body,
      endTime: body.startTime.substring(0, 11) + endHour + body.startTime.substring(16),
      status: 'ACTIVE',
      cancelledAt: null,
      createdAt: new Date().toISOString(),
    };
    appointments.push(newAppt);
    return newAppt as unknown as T;
  }

  if (url.pathname.startsWith('/appointments/') && method === 'PATCH') {
    const id = url.pathname.split('/')[2];
    const body = JSON.parse(options.body as string) as UpdateAppointmentDto;
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new ApiRequestError(404, 'NOT_FOUND', 'La cita no existe', []);
    
    const appt = appointments[idx];
    if (appt.status === 'CANCELLED') throw new ApiRequestError(409, 'ALREADY_CANCELLED', 'La cita ya está cancelada', []);
    
    if (checkSlotTaken(appt.specialty, body.startTime, id)) {
      throw new ApiRequestError(409, 'SLOT_TAKEN', `El horario ya está ocupado para ${SPECIALTY_LABELS[appt.specialty]}`, []);
    }
    
    const endHour = nextHalf(body.startTime.substring(11, 16));
    appointments[idx] = {
      ...appt,
      startTime: body.startTime,
      endTime: body.startTime.substring(0, 11) + endHour + body.startTime.substring(16),
    };
    return appointments[idx] as unknown as T;
  }

  if (url.pathname.startsWith('/appointments/') && method === 'DELETE') {
    const id = url.pathname.split('/')[2];
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new ApiRequestError(404, 'NOT_FOUND', 'La cita no existe', []);
    if (appointments[idx].status === 'CANCELLED') {
      throw new ApiRequestError(409, 'ALREADY_CANCELLED', 'La cita ya está cancelada', []);
    }
    appointments[idx].status = 'CANCELLED';
    appointments[idx].cancelledAt = new Date().toISOString();
    return undefined as unknown as T;
  }

  if (url.pathname === '/metrics/summary' && method === 'GET') {
    // Basic mock for metrics so it doesn't fail
    return {
      range: { from: '2026-09-28', to: '2026-10-02', businessDays: 5 },
      totals: { active: 1, cancelled: 0, capacity: 360, occupancyRate: 0.003, cancellationRate: 0 },
      bySpecialty: [],
      byDay: [],
      byHour: []
    } as unknown as T;
  }

  throw new ApiRequestError(404, 'NOT_FOUND', 'Mock not implemented for this endpoint', []);
}
