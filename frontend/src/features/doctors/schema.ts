import { z } from 'zod';
import { SPECIALTIES } from '@/types/api';

export const doctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  specialty: z.enum(SPECIALTIES, { message: 'Elige una especialidad' }),
});

export type DoctorFormValues = z.infer<typeof doctorSchema>;
