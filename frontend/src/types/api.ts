export const SPECIALTIES = [
  'MEDICINA_GENERAL',
  'PEDIATRIA',
  'CARDIOLOGIA',
  'DERMATOLOGIA',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

export interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  active: boolean;
  /** Citas ACTIVE de su especialidad desde ahora; 0 si está inactivo. */
  upcomingAppointments: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorsResponse {
  data: Doctor[];
}

export interface CreateDoctorDto {
  name: string;
  specialty: Specialty;
}

export interface UpdateDoctorDto {
  name?: string;
  active?: boolean;
}

export type AppointmentStatus = 'ACTIVE' | 'CANCELLED';

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  specialty: Specialty;
  doctorName?: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelledAt: string | null;
  createdAt: string;
}

export interface CreateAppointmentDto {
  patientName: string;
  patientEmail: string;
  specialty: Specialty;
  startTime: string;
}

export interface UpdateAppointmentDto {
  startTime: string;
}

export interface SlotDoctor {
  id: string;
  name: string;
}

export interface Slot {
  specialty: Specialty;
  doctor?: SlotDoctor | null;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  isBusinessDay: boolean;
  slots: Slot[];
}

export interface AppointmentsResponse {
  data: Appointment[];
}

export type AppointmentFilterStatus = 'ACTIVE' | 'CANCELLED' | 'ALL';

export interface AppointmentsQuery {
  specialty?: Specialty;
  date?: string;
  status?: AppointmentFilterStatus;
}

export interface AvailabilityQuery {
  date: string;
  specialty?: Specialty;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SLOT_TAKEN'
  | 'ALREADY_CANCELLED'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'SPECIALTY_HAS_DOCTOR'
  | 'DOCTOR_HAS_APPOINTMENTS'
  | 'NO_DOCTOR'
  | 'INTERNAL_ERROR';

export interface ApiError {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
}

export interface MetricsQuery {
  from?: string;
  to?: string;
  specialty?: Specialty;
}

export interface MetricsSummary {
  range: { from: string; to: string; businessDays: number };
  totals: {
    active: number;
    cancelled: number;
    capacity: number;
    occupancyRate: number;
    cancellationRate: number;
  };
  bySpecialty: {
    specialty: Specialty;
    active: number;
    cancelled: number;
    capacity: number;
    occupancyRate: number;
  }[];
  byDay: { date: string; active: number; cancelled: number }[];
  byHour: { hour: string; active: number }[];
}
