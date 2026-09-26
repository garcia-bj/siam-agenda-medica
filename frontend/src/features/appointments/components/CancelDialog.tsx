'use client';

import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import type { Appointment } from '@/types/api';
import { appointmentDate, appointmentTime } from './AppointmentList';
import { useCancelAppointment } from '../hooks/useAppointments';

interface Props { appointment: Appointment | null; onClose: () => void; }

export default function CancelDialog({ appointment, onClose }: Props) {
  const mutation = useCancelAppointment();
  if (!appointment) return null;

  async function confirm() {
    if (!appointment) return;
    try {
      await mutation.mutateAsync(appointment.id);
      toast.success('La cita fue cancelada correctamente.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar la cita.');
    }
  }

  return (
    <Modal open={!!appointment} onClose={mutation.isPending ? () => undefined : onClose} title="Cancelar cita">
      <div className="action-dialog">
        <p className="action-dialog__eyebrow">Cancelar cita</p>
        <h2>¿Quieres cancelar esta cita?</h2>
        <div className="action-dialog__summary">
          <div className="patient-cell"><span className="patient-avatar">{appointment.patientName.split(/\s+/).slice(0,2).map((x) => x[0]).join('').toUpperCase()}</span><strong>{appointment.patientName}</strong></div>
          <SpecialtyTag specialty={appointment.specialty} />
          <div><span>Fecha</span><strong>{appointmentDate(appointment.startTime)}</strong></div>
          <div><span>Hora</span><strong>{appointmentTime(appointment.startTime)}</strong></div>
        </div>
        <div className="action-dialog__buttons">
          <Button autoFocus variant="ghost" disabled={mutation.isPending} onClick={onClose}>Volver</Button>
          <Button variant="danger" disabled={mutation.isPending} onClick={confirm}>{mutation.isPending ? 'Cancelando…' : 'Sí, cancelar cita'}</Button>
        </div>
      </div>
    </Modal>
  );
}
