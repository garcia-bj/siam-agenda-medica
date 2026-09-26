'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DatePicker from '@/features/availability/components/DatePicker';
import DayStrip from '@/features/availability/components/DayStrip';
import SlotGrid from '@/features/availability/components/SlotGrid';
import SpecialtyPills, { SPECIALTY_LABELS } from '@/features/availability/components/SpecialtyPills';
import { firstBookableDay, formatDayLong, slotTime, todayInClinic } from '@/features/availability/dates';
import BookingForm from '@/features/booking/components/BookingForm';
import type { Slot, Specialty } from '@/types/api';

export default function HomePage() {
  const router = useRouter();
  const [today] = useState(() => todayInClinic());
  const [firstDay] = useState(() => firstBookableDay());
  const [date, setDate] = useState(firstDay);
  const [specialty, setSpecialty] = useState<Specialty>('MEDICINA_GENERAL');
  const [slot, setSlot] = useState<Slot | null>(null);

  const changeDate = (next: string) => {
    setDate(next);
    setSlot(null);
  };
  const changeSpecialty = (next: Specialty) => {
    setSpecialty(next);
    setSlot(null);
  };

  const handleBooked = () => {
    toast.success('Cita confirmada', {
      description: `${formatDayLong(date)} · ${slotTime(slot!.startTime)} – ${slotTime(slot!.endTime)}`,
      action: { label: 'Ver en Citas', onClick: () => router.push('/citas') },
      duration: 5000,
    });
    setSlot(null);
  };

  const handleSlotTaken = () => {
    toast.error('Ese horario acaba de ser tomado', { duration: 5000 });
    setSlot(null);
  };

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 lg:px-12">
      <div>
        <h1 className="font-heading text-3xl font-semibold lg:text-4xl">Agendar una cita</h1>
        <p className="mt-1.5 text-muted">Lunes a viernes, de 09:00 a 18:00 · bloques de 30 minutos</p>
      </div>

      <SpecialtyPills value={specialty} onChange={changeSpecialty} />

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)_336px]">
        <section aria-labelledby="cal-title" className={CARD}>
          <h2 id="cal-title" className="text-[17px] font-semibold">1. Elige la fecha</h2>
          <div className="hidden lg:block">
            <DatePicker value={date} today={today} onChange={changeDate} />
          </div>
          <div className="lg:hidden">
            <DayStrip value={date} from={firstDay} onChange={changeDate} />
          </div>
        </section>

        <section aria-labelledby="slot-title" className={CARD}>
          <div>
            <h2 id="slot-title" className="text-[17px] font-semibold">2. Elige el horario</h2>
            <p className="mt-1.5 text-muted">
              {formatDayLong(date)} · {SPECIALTY_LABELS[specialty]}
            </p>
          </div>
          <SlotGrid date={date} specialty={specialty} selected={slot?.startTime} onSelect={setSlot} />
        </section>

        <section aria-labelledby="summary-title" className={CARD}>
          <h2 id="summary-title" className="text-[17px] font-semibold">
            {slot ? '3. Confirma tu cita' : 'Horario elegido'}
          </h2>
          {slot ? (
            <>
              <p className="rounded-xl bg-primary-soft px-3.5 py-2.5 font-semibold text-primary-ink">
                {formatDayLong(date)} · {slotTime(slot.startTime)} – {slotTime(slot.endTime)}
              </p>
              <BookingForm
                key={slot.startTime}
                slot={slot}
                specialty={specialty}
                onBooked={handleBooked}
                onSlotTaken={handleSlotTaken}
              />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[#CFCCC3] bg-bg px-3.5 py-2.5 text-muted">
              Elige un horario disponible
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

const CARD = 'flex flex-col gap-4 rounded-[18px] border border-line bg-surface p-6';
