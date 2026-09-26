import { z } from 'zod';
import { SPECIALTIES } from '@/types/api';

export const bookingSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  patientEmail: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .email('Ingresa un email válido'),
  specialty: z.enum(SPECIALTIES, { message: 'Selecciona una especialidad válida' }),
  startTime: z.string().min(1, 'Selecciona un horario'),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
