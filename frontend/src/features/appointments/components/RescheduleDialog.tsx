'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import Spinner from '@/components/ui/Spinner';
import type { Appointment, Slot } from '@/types/api';
import { fetchAvailability } from '@/lib/api/availability';
import { ApiRequestError } from '@/lib/api/client';
import { appointmentDate, appointmentTime } from './AppointmentList';
import { useRescheduleAppointment } from '../hooks/useAppointments';
import { useQuery } from '@tanstack/react-query';

interface Props { appointment: Appointment | null; onClose: () => void; }

function addBusinessDays(date: string, count: number) {
  const result: string[] = [];
  const d = new Date(`${date}T12:00:00-04:00`);
  while (result.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) result.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat('es-BO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/La_Paz' }).format(new Date(`${date}T12:00:00-04:00`)).replace(/\./g, '');
}

export default function RescheduleDialog({ appointment, onClose }: Props) {
  const mutation = useRescheduleAppointment();
  const firstDayRef = useRef<HTMLButtonElement>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotTaken, setSlotTaken] = useState(false);
  const days = useMemo(() => appointment ? addBusinessDays(appointment.startTime.slice(0,10), 5) : [], [appointment]);

  useEffect(() => {
    if (appointment) {
      setSelectedDate(appointment.startTime.slice(0, 10));
      setSelectedSlot(appointment.startTime);
      setSlotTaken(false);
      requestAnimationFrame(() => firstDayRef.current?.focus());
    }
  }, [appointment]);

  const availability = useQuery({
    queryKey: ['availability', selectedDate, appointment?.specialty],
    queryFn: () => fetchAvailability({ date: selectedDate, specialty: appointment!.specialty }),
    enabled: !!appointment && !!selectedDate,
  });

  if (!appointment) return null;

  const slots = availability.data?.slots ?? [];
  const currentSlot = appointment.startTime;
  const hasChange = selectedSlot && selectedSlot !== currentSlot;

  async function save() {
    if (!appointment || !hasChange) return;
    try {
      await mutation.mutateAsync({ id: appointment.id, dto: { startTime: selectedSlot } });
      toast.success('La cita fue reprogramada correctamente.');
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError && error.statusCode === 409) {
        setSlotTaken(true);
        await availability.refetch();
        return;
      }
      toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar la cita.');
    }
  }

  return (
    <Modal open={!!appointment} onClose={mutation.isPending ? () => undefined : onClose} title="Reprogramar cita">
      <div className="reschedule-dialog">
        <div className="action-dialog__head">
          <div><p className="action-dialog__eyebrow">Reprogramar cita</p><h2>Elige un nuevo horario</h2></div>
          <SpecialtyTag specialty={appointment.specialty} />
        </div>
        <div className="action-dialog__patient"><strong>{appointment.patientName}</strong><span>{appointmentDate(appointment.startTime)} · {appointmentTime(appointment.startTime)}</span></div>

        <div className="day-strip" aria-label="Días disponibles">
          {days.map((day: string, index: number) => {
            const current = day === currentSlot.slice(0,10);
            return <button key={day} ref={index === 0 ? firstDayRef : undefined} className={selectedDate === day ? 'is-selected' : ''} onClick={() => { setSelectedDate(day); setSelectedSlot(day === currentSlot.slice(0,10) ? currentSlot : ''); }}><span>{dayLabel(day)}</span>{current && <small>Actual</small>}</button>;
          })}
        </div>

        {slotTaken && <div className="dialog-inline-error" role="alert">Ese horario se ocupó mientras lo estabas seleccionando. Los horarios disponibles fueron actualizados.</div>}

        {availability.isLoading ? <div className="appointments-state"><Spinner /></div> : availability.isError ? <div className="appointments-state appointments-state--error">No se pudieron cargar los horarios.</div> : (
          <div className="slot-grid" aria-label="Horarios disponibles">
            {slots.map((slot: Slot) => {
              const isCurrent = slot.startTime === currentSlot;
              const disabled = !slot.available && !isCurrent;
              return <button key={slot.startTime} disabled={disabled} className={`${selectedSlot === slot.startTime ? 'is-selected' : ''} ${isCurrent ? 'is-current' : ''}`} onClick={() => setSelectedSlot(slot.startTime)}>{appointmentTime(slot.startTime)}{isCurrent && <small>Actual</small>}</button>;
            })}
          </div>
        )}

        <div className="new-appointment-preview"><span>Nueva cita</span><strong>{selectedSlot ? `${appointmentDate(selectedSlot)} · ${appointmentTime(selectedSlot)}` : 'Selecciona un horario'}</strong></div>
        <div className="action-dialog__buttons"><Button variant="ghost" disabled={mutation.isPending} onClick={onClose}>Volver</Button><Button disabled={!hasChange || mutation.isPending} onClick={save}>{mutation.isPending ? 'Guardando…' : 'Guardar cambio'}</Button></div>
      </div>
    </Modal>
  );
}
