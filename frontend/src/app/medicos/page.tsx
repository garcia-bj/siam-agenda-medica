'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import Spinner from '@/components/ui/Spinner';
import DoctorFormDialog from '@/features/doctors/components/DoctorFormDialog';
import DoctorList from '@/features/doctors/components/DoctorList';
import ToggleDoctorDialog from '@/features/doctors/components/ToggleDoctorDialog';
import { useDoctors } from '@/features/doctors/hooks/useDoctors';
import { SPECIALTIES, type Doctor } from '@/types/api';

export default function MedicosPage() {
  const { data, isLoading, isError, refetch } = useDoctors();
  const [showInactive, setShowInactive] = useState(true);
  // undefined = cerrado, null = registrar uno nuevo, Doctor = editar
  const [editing, setEditing] = useState<Doctor | null | undefined>(undefined);
  const [toggling, setToggling] = useState<Doctor | null>(null);

  const doctors = data?.data ?? [];
  const activeCount = doctors.filter((d) => d.active).length;
  const visible = doctors
    .filter((d) => showInactive || d.active)
    .sort(
      (a, b) =>
        SPECIALTIES.indexOf(a.specialty) - SPECIALTIES.indexOf(b.specialty) ||
        Number(b.active) - Number(a.active),
    );

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 lg:px-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold lg:text-4xl">Médicos</h1>
          <p className="mt-1.5 text-muted">
            Un solo médico activo por especialidad. Para desactivar a un médico, primero no debe tener citas próximas.
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>Registrar médico</Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Spinner size={32} />
          <p className="text-sm font-medium text-muted">Cargando médicos...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface p-8 text-center">
          <p className="font-semibold text-danger">Ocurrió un error al cargar los médicos.</p>
          <Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : (
        <>
          <section aria-label="Cobertura por especialidad" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SPECIALTIES.map((s) => {
              const doc = doctors.find((d) => d.active && d.specialty === s);
              return (
                <div
                  key={s}
                  className={`flex flex-col gap-3 rounded-xl p-4 ${
                    doc ? 'border border-line bg-surface' : 'border border-dashed border-[#E8A765] bg-[#FFF7ED]'
                  }`}
                >
                  <div><SpecialtyTag specialty={s} /></div>
                  <div>
                    <p className={`font-semibold ${doc ? 'text-ink' : 'text-[#9A3412]'}`}>
                      {doc ? doc.name : 'Sin médico activo'}
                    </p>
                    <p className="text-xs text-muted">{doc ? 'Atiende esta especialidad' : 'No se puede agendar'}</p>
                  </div>
                </div>
              );
            })}
          </section>

          <section aria-label="Lista de médicos" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                {activeCount} activos · {doctors.length - activeCount} inactivos
              </p>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Mostrar inactivos
              </label>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface">
                <EmptyState
                  title="No hay médicos para mostrar"
                  description="Registra un médico para que su especialidad tenga horarios."
                />
              </div>
            ) : (
              <DoctorList doctors={visible} onEdit={setEditing} onToggle={setToggling} />
            )}
          </section>
        </>
      )}

      {editing !== undefined && (
        <DoctorFormDialog
          key={editing?.id ?? 'new'}
          doctor={editing}
          doctors={doctors}
          onClose={() => setEditing(undefined)}
        />
      )}
      {toggling && (
        <ToggleDoctorDialog
          key={toggling.id}
          doctor={toggling}
          doctors={doctors}
          onClose={() => setToggling(null)}
        />
      )}
    </main>
  );
}
