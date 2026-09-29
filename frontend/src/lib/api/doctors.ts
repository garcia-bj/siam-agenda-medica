import type {
  CreateDoctorDto,
  Doctor,
  DoctorsResponse,
  UpdateDoctorDto,
} from '@/types/api';
import { apiFetch } from './client';

export function fetchDoctors(): Promise<DoctorsResponse> {
  return apiFetch<DoctorsResponse>('/doctors');
}

export function createDoctor(dto: CreateDoctorDto): Promise<Doctor> {
  return apiFetch<Doctor>('/doctors', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateDoctor(id: string, dto: UpdateDoctorDto): Promise<Doctor> {
  return apiFetch<Doctor>(`/doctors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}
