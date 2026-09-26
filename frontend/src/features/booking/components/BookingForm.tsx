'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { ApiRequestError } from '@/lib/api/client';
import type { Slot, Specialty } from '@/types/api';
import { useCreateAppointment } from '../hooks/useCreateAppointment';
import { bookingSchema, type BookingFormValues } from '../schema';

interface BookingFormProps {
  slot: Slot;
  specialty: Specialty;
  /** Called after the appointment is created successfully. */
  onBooked: () => void;
  /** Called when the server responds with SLOT_TAKEN (409). */
  onSlotTaken?: () => void;
}

export default function BookingForm({ slot, specialty, onBooked, onSlotTaken }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      patientName: '',
      patientEmail: '',
      specialty,
      startTime: slot.startTime,
    },
  });

  const mutation = useCreateAppointment({ onSlotTaken });

  const onSubmit = handleSubmit((data) => {
    // Always use current props for specialty and startTime so changes
    // after mount are picked up (e.g. user selects a different slot
    // without unmounting this component).
    mutation.mutate(
      { ...data, specialty, startTime: slot.startTime },
      {
        onSuccess: () => onBooked(),
        onError: (err) => {
          if (err instanceof ApiRequestError) {
            if (err.code === 'VALIDATION_ERROR' && err.details.length > 0) {
              for (const d of err.details) {
                const field = d.field as keyof BookingFormValues;
                if (field in bookingSchema.shape) {
                  setError(field, { message: d.message });
                }
              }
            } else {
              setError('root', { message: err.message });
            }
          } else {
            setError('root', { message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
          }
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Nombre del paciente"
        placeholder="Juan Pérez"
        autoComplete="name"
        error={errors.patientName?.message}
        {...register('patientName')}
      />

      <Input
        label="Email"
        type="email"
        placeholder="juan@correo.com"
        autoComplete="email"
        error={errors.patientEmail?.message}
        {...register('patientEmail')}
      />

      {errors.root && (
        <p role="alert" className="rounded-lg bg-[#FEF3F2] px-3 py-2 text-sm font-medium text-danger">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" variant="primary" wide disabled={mutation.isPending}>
        {mutation.isPending ? <><Spinner size={18} /> Reservando…</> : 'Confirmar cita'}
      </Button>
    </form>
  );
}
