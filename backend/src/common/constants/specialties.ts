export const SPECIALTIES = ['MEDICINA_GENERAL', 'PEDIATRIA', 'CARDIOLOGIA', 'DERMATOLOGIA'] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};
