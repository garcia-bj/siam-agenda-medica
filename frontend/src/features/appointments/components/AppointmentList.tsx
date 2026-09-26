'use client';

import Link from 'next/link';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import Spinner from '@/components/ui/Spinner';
import type { Appointment } from '@/types/api';

function formatDate(value: string) {
  const parts = new Intl.DateTimeFormat('es-BO', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/La_Paz',
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = months[Math.max(0, Number(get('month')) - 1)];
  const weekday = get('weekday').replace('.', '');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get('day')} ${month} ${get('year')}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

export function appointmentDate(value: string) {
  return formatDate(value);
}

export function appointmentTime(value: string) {
  return formatTime(value);
}

interface Props {
  appointments: Appointment[];
  loading?: boolean;
  error?: boolean;
  onCancel: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
}

export default function AppointmentList({ appointments, loading, error, onCancel, onReschedule }: Props) {
  if (loading) {
    return <div className="appointments-state" role="status"><Spinner /></div>;
  }

  if (error) {
    return <div className="appointments-state appointments-state--error" role="alert">No se pudieron cargar las citas. Intenta nuevamente.</div>;
  }

  if (!appointments.length) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No hay citas para mostrar</p>
        <p className="empty-state__desc">Puedes agendar una nueva cita desde la pantalla de agenda.</p>
        <Link className="btn btn--secondary" href="/">Agendar cita</Link>
      </div>
    );
  }

  return (
    <>
      <div className="appointments-table-wrap">
        <table className="appointments-table">
          <thead>
            <tr><th>Paciente</th><th>Email</th><th>Especialidad</th><th>Fecha</th><th>Hora</th><th aria-label="Acciones" /></tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td><div className="patient-cell"><span className="patient-avatar">{initials(appointment.patientName)}</span><strong>{appointment.patientName}</strong></div></td>
                <td>{appointment.patientEmail}</td>
                <td><SpecialtyTag specialty={appointment.specialty} /></td>
                <td>{formatDate(appointment.startTime)}</td>
                <td>{formatTime(appointment.startTime)}</td>
                <td><div className="appointment-actions"><button onClick={() => onReschedule(appointment)}>Reprogramar</button><button className="appointment-actions__danger" onClick={() => onCancel(appointment)}>Cancelar</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="appointments-cards">
        {appointments.map((appointment) => (
          <article className="appointment-card" key={appointment.id}>
            <div className="appointment-card__head">
              <div className="patient-cell"><span className="patient-avatar">{initials(appointment.patientName)}</span><strong>{appointment.patientName}</strong></div>
              <SpecialtyTag specialty={appointment.specialty} />
            </div>
            <p className="appointment-card__email">{appointment.patientEmail}</p>
            <div className="appointment-card__meta">
              <span>{formatDate(appointment.startTime)}</span>
              <strong>{formatTime(appointment.startTime)}</strong>
            </div>
            <div className="appointment-card__actions">
              <button onClick={() => onReschedule(appointment)}>Reprogramar</button>
              <button className="appointment-actions__danger" onClick={() => onCancel(appointment)}>Cancelar</button>
            </div>
          </article>
        ))}
      </div>
      <Link className="appointments-mobile-link" href="/">Agendar otra cita</Link>
    </>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}
