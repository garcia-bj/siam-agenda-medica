import type {
  Appointment,
  AvailabilityResponse,
  Slot,
  Specialty,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  Doctor,
  CreateDoctorDto,
  UpdateDoctorDto,
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
    doctorName: 'Dr. Martín Gutiérrez',
    startTime: '2026-09-28T10:30:00-04:00',
    endTime: '2026-09-28T11:00:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T08:00:00-04:00',
  }
];

type MockDoctor = Omit<Doctor, 'upcomingAppointments'>;

const doctors: MockDoctor[] = [
  { name: 'Dr. Martín Gutiérrez', specialty: 'MEDICINA_GENERAL' as Specialty, active: true },
  { name: 'Dra. Sofía Arce', specialty: 'PEDIATRIA' as Specialty, active: true },
  { name: 'Dr. Ricardo Salazar', specialty: 'CARDIOLOGIA' as Specialty, active: true },
  { name: 'Dra. Camila Vega', specialty: 'DERMATOLOGIA' as Specialty, active: true },
].map((doc) => ({
  id: randomId(),
  ...doc,
  createdAt: '2026-09-25T08:00:00-04:00',
  updatedAt: '2026-09-25T08:00:00-04:00',
}));

function upcomingFor(doctor: MockDoctor): number {
  if (!doctor.active) return 0;
  const now = Date.now();
  return appointments.filter(
    (a) =>
      a.specialty === doctor.specialty &&
      a.status === 'ACTIVE' &&
      new Date(a.startTime).getTime() >= now,
  ).length;
}

function toDoctor(doctor: MockDoctor): Doctor {
  return { ...doctor, upcomingAppointments: upcomingFor(doctor) };
}

function assertSpecialtyFree(specialty: Specialty, excludeId?: string) {
  const holder = doctors.find((d) => d.active && d.specialty === specialty && d.id !== excludeId);
  if (holder) {
    throw new ApiRequestError(
      409,
      'SPECIALTY_HAS_DOCTOR',
      `${SPECIALTY_LABELS[specialty]} ya tiene un médico activo (${holder.name})`,
      [],
    );
  }
}

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
      const doc = doctors.find((d) => d.specialty === spec && d.active);
      const hasDoctor = !!doc;
      
      slots.push({
        specialty: spec,
        doctor: doc ? { id: doc.id, name: doc.name } : null,
        startTime,
        endTime: `${date}T${nextHalf(hour)}:00-04:00`,
        available: !isPast && !taken && hasDoctor,
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
    const doc = doctors.find(d => d.specialty === body.specialty && d.active);
    if (!doc) {
      throw new ApiRequestError(422, 'NO_DOCTOR', `La especialidad ${SPECIALTY_LABELS[body.specialty]} no tiene médico activo`, []);
    }
    const newAppt: Appointment = {
      id: randomId(),
      ...body,
      doctorName: doc.name,
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

  if (url.pathname === '/doctors' && method === 'GET') {
    return { data: doctors.map(toDoctor) } as unknown as T;
  }

  if (url.pathname === '/doctors' && method === 'POST') {
    const body = JSON.parse(options.body as string) as CreateDoctorDto;
    assertSpecialtyFree(body.specialty);
    const now = new Date().toISOString();
    const doctor: MockDoctor = {
      id: randomId(),
      name: body.name.trim(),
      specialty: body.specialty,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    doctors.push(doctor);
    return toDoctor(doctor) as unknown as T;
  }

  if (url.pathname.startsWith('/doctors/') && method === 'PATCH') {
    const id = url.pathname.split('/')[2];
    const body = JSON.parse(options.body as string) as UpdateDoctorDto;
    const doctor = doctors.find((d) => d.id === id);
    if (!doctor) throw new ApiRequestError(404, 'NOT_FOUND', 'El médico no existe', []);

    if (body.active === false && doctor.active) {
      const upcoming = upcomingFor(doctor);
      if (upcoming > 0) {
        throw new ApiRequestError(
          409,
          'DOCTOR_HAS_APPOINTMENTS',
          `${doctor.name} tiene ${upcoming} ${upcoming === 1 ? 'cita próxima' : 'citas próximas'}`,
          [],
        );
      }
    }
    if (body.active === true && !doctor.active) assertSpecialtyFree(doctor.specialty, doctor.id);

    if (body.name !== undefined) doctor.name = body.name.trim();
    if (body.active !== undefined) doctor.active = body.active;
    doctor.updatedAt = new Date().toISOString();
    return toDoctor(doctor) as unknown as T;
  }

  if (url.pathname === '/metrics/summary' && method === 'GET') {
    const fromParam = url.searchParams.get('from') || '2026-09-28';
    const toParam = url.searchParams.get('to') || '2026-10-02';
    const specParam = url.searchParams.get('specialty') as Specialty | null;

    // Count business days in range
    let businessDays = 0;
    const cursor = new Date(`${fromParam}T12:00:00`);
    const end = new Date(`${toParam}T12:00:00`);
    while (cursor <= end) {
      const wd = cursor.getDay();
      if (wd !== 0 && wd !== 6) businessDays++;
      cursor.setDate(cursor.getDate() + 1);
    }

    const specs = specParam ? [specParam] : CLINIC_SPECIALTIES;
    const capacity = businessDays * 18 * specs.length;

    // Generate realistic mock appointments for the range
    const mockActive: { specialty: Specialty; date: string; hour: string }[] = [];
    const mockCancelled: { specialty: Specialty; date: string }[] = [];

    const rangeCursor = new Date(`${fromParam}T12:00:00`);
    while (rangeCursor <= end) {
      const wd = rangeCursor.getDay();
      if (wd !== 0 && wd !== 6) {
        const dateStr = rangeCursor.toISOString().slice(0, 10);
        for (const spec of specs) {
          // Seed-based distribution: more appointments for Medicina General
          const base = spec === 'MEDICINA_GENERAL' ? 6 : spec === 'PEDIATRIA' ? 5 : spec === 'CARDIOLOGIA' ? 4 : 3;
          const count = base + (rangeCursor.getDate() % 3) - 1;
          for (let i = 0; i < count; i++) {
            const hourIdx = (i * 3 + rangeCursor.getDate()) % HOURS.length;
            mockActive.push({ specialty: spec, date: dateStr, hour: HOURS[hourIdx] });
          }
          // ~1 cancellation every 3 days per specialty
          if (rangeCursor.getDate() % 3 === 0) {
            mockCancelled.push({ specialty: spec, date: dateStr });
          }
        }
      }
      rangeCursor.setDate(rangeCursor.getDate() + 1);
    }

    const totalActive = mockActive.length;
    const totalCancelled = mockCancelled.length;
    const occupancyRate = capacity > 0 ? Math.round((totalActive / capacity) * 1000) / 1000 : 0;
    const cancellationRate = (totalActive + totalCancelled) > 0
      ? Math.round((totalCancelled / (totalActive + totalCancelled)) * 1000) / 1000
      : 0;

    // bySpecialty
    const bySpecialty = specs.map(spec => {
      const active = mockActive.filter(a => a.specialty === spec).length;
      const cancelled = mockCancelled.filter(c => c.specialty === spec).length;
      const specCapacity = businessDays * 18;
      return {
        specialty: spec,
        active,
        cancelled,
        capacity: specCapacity,
        occupancyRate: specCapacity > 0 ? Math.round((active / specCapacity) * 1000) / 1000 : 0,
      };
    });

    // byDay
    const dayMap = new Map<string, { active: number; cancelled: number }>();
    for (const a of mockActive) {
      const entry = dayMap.get(a.date) || { active: 0, cancelled: 0 };
      entry.active++;
      dayMap.set(a.date, entry);
    }
    for (const c of mockCancelled) {
      const entry = dayMap.get(c.date) || { active: 0, cancelled: 0 };
      entry.cancelled++;
      dayMap.set(c.date, entry);
    }
    const byDay = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // byHour
    const hourMap = new Map<string, number>();
    for (const a of mockActive) {
      const h = a.hour.slice(0, 2) + ':00';
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    }
    const byHour = Array.from(hourMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, active]) => ({ hour, active }));

    return {
      range: { from: fromParam, to: toParam, businessDays },
      totals: { active: totalActive, cancelled: totalCancelled, capacity, occupancyRate, cancellationRate },
      bySpecialty,
      byDay,
      byHour,
    } as unknown as T;
  }

  if (url.pathname === '/reports/appointments' && method === 'GET') {
    const format = url.searchParams.get('format') || 'csv';
    const csvContent = '\uFEFFID,Paciente,Especialidad\n1,Carlos Méndez,Pediatría\n2,Ana Gómez,Cardiología';
    const blob = new Blob([csvContent], { type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8;' });
    return {
      blob,
      filename: `reporte-ejemplo.${format}`,
    } as unknown as T;
  }

  throw new ApiRequestError(404, 'NOT_FOUND', 'Mock not implemented for this endpoint', []);
}
