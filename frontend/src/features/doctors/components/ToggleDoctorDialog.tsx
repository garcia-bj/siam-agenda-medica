'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { ApiRequestError } from '@/lib/api/client';
import { SPECIALTY_LABELS, type Doctor } from '@/types/api';
import { useUpdateDoctor } from '../hooks/useDoctors';

interface ToggleDoctorDialogProps {
  doctor: Doctor;
  doctors: Doctor[];
  onClose: () => void;
}

function citas(n: number) {
  return n === 1 ? '1 cita próxima' : `${n} citas próximas`;
}

/** Por qué no se puede cambiar el estado ahora, o `null` si se puede. */
function blockReason(doctor: Doctor, doctors: Doctor[]): string | null {
  const specialty = SPECIALTY_LABELS[doctor.specialty];
  if (doctor.active && doctor.upcomingAppointments > 0) {
    return `${doctor.name} tiene ${citas(doctor.upcomingAppointments)} en ${specialty}. Cancélalas primero desde Citas.`;
  }
  const holder = doctors.find((d) => d.active && d.specialty === doctor.specialty && d.id !== doctor.id);
  if (!doctor.active && holder) {
    return `${specialty} ya tiene un médico activo (${holder.name}). Desactívalo antes de reactivar a ${doctor.name}.`;
  }
  return null;
}

export default function ToggleDoctorDialog({ doctor, doctors, onClose }: ToggleDoctorDialogProps) {
  const mutation = useUpdateDoctor();
  const [serverError, setServerError] = useState<string | null>(null);

  const deactivating = doctor.active;
  const blocked = serverError ?? blockReason(doctor, doctors);
  const specialty = SPECIALTY_LABELS[doctor.specialty];
  const title = blocked
    ? deactivating ? 'No se puede desactivar' : 'No se puede reactivar'
    : deactivating ? 'Desactivar médico' : 'Reactivar médico';

  const handleConfirm = () => {
    mutation.mutate(
      { id: doctor.id, dto: { active: !doctor.active } },
      {
        onSuccess: onClose,
        onError: (err) => {
          setServerError(
            err instanceof ApiRequestError
              ? err.message
              : 'No se pudo guardar el cambio. Inténtalo de nuevo.',
          );
        },
      },
    );
  };

  return (
    <Modal open onClose={mutation.isPending ? () => {} : onClose} title={title}>
      <div className="flex w-[min(28rem,80vw)] flex-col gap-5">
        <p aria-hidden="true" className="font-heading text-2xl font-semibold text-ink">{title}</p>

        {blocked ? (
          <p role="alert" className="rounded-lg bg-[#FEF3F2] px-3 py-2 text-sm font-medium text-danger">
            {blocked}
          </p>
        ) : (
          <p className="text-sm text-muted">
            {deactivating
              ? `${specialty} quedará sin médico activo y no se podrán agendar citas hasta registrar o reactivar otro.`
              : `${doctor.name} volverá a atender ${specialty}.`}
          </p>
        )}

        <div className="flex justify-end gap-3">
          {blocked ? (
            <>
              {deactivating && (
                <Link href="/citas" className="btn btn--ghost">
                  Ir a Citas
                </Link>
              )}
              <Button onClick={onClose}>Entendido</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                Volver
              </Button>
              <Button
                variant={deactivating ? 'danger' : 'primary'}
                onClick={handleConfirm}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <><Spinner size={16} /> Guardando…</>
                ) : deactivating ? (
                  'Sí, desactivar'
                ) : (
                  'Sí, reactivar'
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
