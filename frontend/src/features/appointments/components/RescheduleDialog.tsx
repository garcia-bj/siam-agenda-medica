'use client';

import { useEffect, useState } from 'react';
import type { Appointment, Slot } from '@/types/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import Spinner from '@/components/ui/Spinner';
import DayStrip from '@/features/availability/components/DayStrip';
import SlotGrid from '@/features/availability/components/SlotGrid';
import { firstBookableDay, formatDayLong, slotTime } from '@/features/availability/dates';
import { useRescheduleAppointment } from '../hooks/useRescheduleAppointment';
import { formatAppointmentDate, formatAppointmentTime } from '../utils/formatDate';

interface RescheduleDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
}

export default function RescheduleDialog({
  appointment,
  open,
  onClose,
}: RescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rescheduleMutation = useRescheduleAppointment();

  useEffect(() => {
    if (appointment && open) {
      // Initialize selected date to appointment date if available, or first bookable day
      const apptDate = appointment.startTime.split('T')[0];
      const initialDate = apptDate >= firstBookableDay() ? apptDate : firstBookableDay();
      setSelectedDate(initialDate);
      setSelectedSlot(null);
      setErrorMessage(null);
    }
  }, [appointment, open]);

  if (!appointment) return null;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setErrorMessage(null);
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setErrorMessage(null);
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;

    rescheduleMutation.mutate(
      {
        id: appointment.id,
        dto: { startTime: selectedSlot.startTime },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: unknown) => {
          const apiError = err as { code?: string; message?: string };
          if (apiError?.code === 'SLOT_TAKEN' || apiError?.message) {
            setErrorMessage(
              apiError.message ||
                'El horario seleccionado ya fue ocupado por otra cita. Por favor elige otro.',
            );
          } else {
            setErrorMessage('Ocurrió un error al reprogramar la cita.');
          }
          setSelectedSlot(null);
        },
      },
    );
  };

  const currentFormattedDate = formatAppointmentDate(appointment.startTime);
  const currentFormattedTime = formatAppointmentTime(appointment.startTime);

  return (
    <Modal open={open} onClose={onClose} title="Reprogramar cita">
      <div className="flex max-w-2xl flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-ink">Reprogramar cita</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg p-3.5 text-sm">
            <span className="font-semibold text-ink">{appointment.patientName}</span>
            <SpecialtyTag specialty={appointment.specialty} />
            <span className="text-xs text-muted">
              Actual: <strong>{currentFormattedDate} · {currentFormattedTime} hs</strong>
            </span>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-danger-dark/30 bg-danger/10 p-3.5 text-sm font-medium text-danger"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink">1. Elige una nueva fecha</p>
          {selectedDate && (
            <DayStrip
              value={selectedDate}
              from={selectedDate}
              onChange={handleDateChange}
              days={5}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">2. Elige un nuevo horario</p>
          {selectedDate && (
            <SlotGrid
              date={selectedDate}
              specialty={appointment.specialty}
              columns={6}
              currentSlot={appointment.startTime}
              selected={selectedSlot?.startTime}
              onSelect={handleSlotSelect}
            />
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {selectedSlot ? (
              <p className="font-medium text-primary-ink">
                Nueva cita:{' '}
                <strong>
                  {formatDayLong(selectedDate)} · {slotTime(selectedSlot.startTime)} –{' '}
                  {slotTime(selectedSlot.endTime)}
                </strong>
              </p>
            ) : (
              <p className="text-muted">Elige un nuevo horario disponible</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={rescheduleMutation.isPending}
            >
              Volver
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!selectedSlot || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? (
                <>
                  <Spinner size={16} />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar cambio'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
