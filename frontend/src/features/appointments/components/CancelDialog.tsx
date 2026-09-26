'use client';

import type { Appointment } from '@/types/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import Spinner from '@/components/ui/Spinner';
import { useCancelAppointment } from '../hooks/useCancelAppointment';
import { formatAppointmentDate, formatAppointmentTime } from '../utils/formatDate';

interface CancelDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
}

export default function CancelDialog({
  appointment,
  open,
  onClose,
}: CancelDialogProps) {
  const cancelMutation = useCancelAppointment();

  if (!appointment) return null;

  const dateFormatted = formatAppointmentDate(appointment.startTime);
  const timeFormatted = formatAppointmentTime(appointment.startTime);

  const handleConfirm = () => {
    cancelMutation.mutate(appointment.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Cancelar cita">
      <div className="flex max-w-md flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold text-ink">Cancelar cita</h2>
          <p className="mt-1 text-sm text-muted">
            ¿Estás seguro de que deseas cancelar esta cita médica? Esta acción liberará el horario para otros pacientes.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{appointment.patientName}</span>
            <SpecialtyTag specialty={appointment.specialty} />
          </div>
          <p className="text-xs text-muted">{appointment.patientEmail}</p>
          <div className="border-t border-line/60 pt-2 text-xs font-medium text-ink">
            {dateFormatted} · {timeFormatted} hs
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={cancelMutation.isPending}
          >
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <>
                <Spinner size={16} />
                <span>Cancelando...</span>
              </>
            ) : (
              'Sí, cancelar cita'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
