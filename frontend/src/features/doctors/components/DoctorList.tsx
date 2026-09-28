import Button from '@/components/ui/Button';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import { getInitials } from '@/features/appointments/utils/formatDate';
import type { Doctor } from '@/types/api';

interface DoctorListProps {
  doctors: Doctor[];
  onEdit: (doctor: Doctor) => void;
  onToggle: (doctor: Doctor) => void;
}

function initialsOf(name: string) {
  return getInitials(name.replace(/^Dra?\.\s*/, ''));
}

function StateBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        active ? 'bg-primary-soft text-primary-ink' : 'bg-busy text-muted'
      }`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${active ? 'bg-primary' : 'bg-muted'}`} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function upcomingText(n: number) {
  if (n === 0) return 'Sin citas';
  return n === 1 ? '1 cita' : `${n} citas`;
}

function Actions({ doctor, onEdit, onToggle, wide = false }: { doctor: Doctor; wide?: boolean } & Omit<DoctorListProps, 'doctors'>) {
  return (
    <>
      <Button variant="ghost" wide={wide} onClick={() => onEdit(doctor)} aria-label={`Editar a ${doctor.name}`}>
        Editar
      </Button>
      <Button
        variant="ghost"
        wide={wide}
        onClick={() => onToggle(doctor)}
        aria-label={`${doctor.active ? 'Desactivar' : 'Reactivar'} a ${doctor.name}`}
        className={doctor.active ? 'text-danger hover:bg-danger/10' : 'text-primary'}
      >
        {doctor.active ? 'Desactivar' : 'Reactivar'}
      </Button>
    </>
  );
}

export default function DoctorList({ doctors, onEdit, onToggle }: DoctorListProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-6 py-3.5">Médico</th>
              <th scope="col" className="px-6 py-3.5">Especialidad</th>
              <th scope="col" className="px-6 py-3.5">Estado</th>
              <th scope="col" className="px-6 py-3.5">Próximas citas</th>
              <th scope="col" className="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {doctors.map((d) => (
              <tr key={d.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        d.active ? 'bg-primary-soft text-primary-ink' : 'bg-bg text-muted'
                      }`}
                    >
                      {initialsOf(d.name)}
                    </div>
                    <span className={`font-semibold ${d.active ? 'text-ink' : 'text-muted'}`}>{d.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4"><SpecialtyTag specialty={d.specialty} /></td>
                <td className="px-6 py-4"><StateBadge active={d.active} /></td>
                <td className={`px-6 py-4 tabular-nums ${d.upcomingAppointments ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {upcomingText(d.upcomingAppointments)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Actions doctor={d} onEdit={onEdit} onToggle={onToggle} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {doctors.map((d) => (
          <article key={d.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                <h3 className={`font-body text-base font-semibold ${d.active ? 'text-ink' : 'text-muted'}`}>{d.name}</h3>
                <div><SpecialtyTag specialty={d.specialty} /></div>
              </div>
              <StateBadge active={d.active} />
            </div>
            <p className="text-xs text-muted">
              Próximas citas: <strong className="text-ink">{upcomingText(d.upcomingAppointments)}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Actions doctor={d} onEdit={onEdit} onToggle={onToggle} wide />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
