'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import { ApiRequestError } from '@/lib/api/client';
import { SPECIALTIES, SPECIALTY_LABELS, type Doctor } from '@/types/api';
import { useCreateDoctor, useUpdateDoctor } from '../hooks/useDoctors';
import { doctorSchema, type DoctorFormValues } from '../schema';

interface DoctorFormDialogProps {
  /** Médico a editar; `null` para registrar uno nuevo. */
  doctor: Doctor | null;
  /** Lista actual, para avisar si la especialidad ya tiene médico activo. */
  doctors: Doctor[];
  onClose: () => void;
}

export default function DoctorFormDialog({ doctor, doctors, onClose }: DoctorFormDialogProps) {
  const isEdit = doctor !== null;
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: doctor?.name ?? '',
      specialty: doctor?.specialty ?? ('' as DoctorFormValues['specialty']),
    },
  });

  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const activeBySpecialty = new Map(doctors.filter((d) => d.active).map((d) => [d.specialty, d]));
  const specialty = useWatch({ control, name: 'specialty' });
  const holder = isEdit ? undefined : activeBySpecialty.get(specialty);

  const options = [
    { value: '', label: 'Elige una especialidad' },
    ...SPECIALTIES.map((s) => {
      const active = activeBySpecialty.get(s);
      return { value: s, label: `${SPECIALTY_LABELS[s]} · ${active ? active.name : 'sin médico activo'}` };
    }),
  ];

  const handleError = (err: unknown) => {
    if (err instanceof ApiRequestError && err.code === 'VALIDATION_ERROR' && err.details.length > 0) {
      for (const d of err.details) {
        if (d.field in doctorSchema.shape) {
          setError(d.field as keyof DoctorFormValues, { message: d.message });
        }
      }
      return;
    }
    setError('root', {
      message: err instanceof ApiRequestError ? err.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    });
  };

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: doctor.id, dto: { name: values.name } },
        { onSuccess: onClose, onError: handleError },
      );
    } else {
      createMutation.mutate(values, { onSuccess: onClose, onError: handleError });
    }
  });

  const title = isEdit ? 'Editar médico' : 'Registrar médico';

  return (
    <Modal open onClose={isPending ? () => {} : onClose} title={title}>
      <form onSubmit={onSubmit} noValidate className="flex w-[min(28rem,80vw)] flex-col gap-5">
        <div>
          <p aria-hidden="true" className="font-heading text-2xl font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm text-muted">
            {isEdit
              ? 'La especialidad no se puede cambiar: para eso, desactiva al médico y registra otro.'
              : 'Solo puede haber un médico activo por especialidad.'}
          </p>
        </div>

        <Input
          label="Nombre completo"
          placeholder="Ej. Dra. Laura Méndez"
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />

        {isEdit ? (
          <div className="field">
            <span className="field__label">Especialidad</span>
            <SpecialtyTag specialty={doctor.specialty} />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Select
              label="Especialidad"
              options={options}
              aria-invalid={Boolean(errors.specialty || holder)}
              {...register('specialty')}
            />
            {errors.specialty && <span className="field__error">{errors.specialty.message}</span>}
            {holder && (
              <span role="alert" className="field__error">
                {SPECIALTY_LABELS[holder.specialty]} ya tiene un médico activo ({holder.name}). Desactívalo en la lista antes de registrar otro.
              </span>
            )}
          </div>
        )}

        {errors.root && (
          <p role="alert" className="rounded-lg bg-[#FEF3F2] px-3 py-2 text-sm font-medium text-danger">
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || Boolean(holder)}>
            {isPending ? <><Spinner size={16} /> Guardando…</> : isEdit ? 'Guardar cambios' : 'Registrar médico'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
