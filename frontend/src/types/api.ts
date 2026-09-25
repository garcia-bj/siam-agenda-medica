// Contrato de la API. Tiene que coincidir con docs/api.md.

export type Specialty = 'MEDICINA_GENERAL' | 'PEDIATRIA' | 'CARDIOLOGIA' | 'DERMATOLOGIA';
export type AppointmentStatus = 'ACTIVE' | 'CANCELLED';
export type AppointmentStatusFilter = AppointmentStatus | 'ALL';
export type ReportFormat = 'csv' | 'xlsx';

export interface Slot {
  specialty: Specialty;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  isBusinessDay: boolean;
  slots: Slot[];
}

export interface AvailabilityQuery {
  date: string;
  specialty?: Specialty;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  specialty: Specialty;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelledAt: string | null;
  createdAt: string;
}

export interface CreateAppointmentInput {
  patientName: string;
  patientEmail: string;
  specialty: Specialty;
  startTime: string;
}

export interface RescheduleAppointmentInput {
  startTime: string;
}

export interface AppointmentsQuery {
  specialty?: Specialty;
  date?: string;
  status?: AppointmentStatusFilter;
}

export interface AppointmentsResponse {
  data: Appointment[];
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
  specialty?: Specialty;
}

export interface MetricsSummary {
  range: { from: string; to: string; businessDays: number };
  totals: { active: number; cancelled: number; capacity: number; occupancyRate: number; cancellationRate: number };
  bySpecialty: { specialty: Specialty; active: number; cancelled: number; capacity: number; occupancyRate: number }[];
  byDay: { date: string; active: number; cancelled: number }[];
  byHour: { hour: string; active: number }[];
}

export interface ReportQuery extends DateRangeQuery {
  status?: AppointmentStatusFilter;
  format?: ReportFormat;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SLOT_TAKEN'
  | 'ALREADY_CANCELLED'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'INTERNAL_ERROR';

export interface ApiError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details: { field: string; message: string }[];
}
