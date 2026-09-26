'use client';

import React, { useState } from 'react';
import { SPECIALTIES, type AppointmentFilterStatus, type Specialty } from '@/types/api';
import { downloadReport } from '@/lib/api/reports';
import { formatDateRangeLabel } from '../utils';

interface ExportReportPanelProps {
  from: string;
  to: string;
  specialty?: Specialty;
}

export default function ExportReportPanel({ from, to, specialty: initialSpecialty }: ExportReportPanelProps) {
  const [specialty, setSpecialty] = useState<Specialty | ''>(initialSpecialty || '');
  const [status, setStatus] = useState<AppointmentFilterStatus | ''>('');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isDownloading, setIsDownloading] = useState(false);

  const rangeLabel = formatDateRangeLabel(from, to);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadReport({
        from,
        to,
        specialty: specialty || undefined,
        status: status || undefined,
        format,
      });
    } catch (err) {
      console.error('Error al descargar reporte:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <article className="dashboard-panel export-report-panel">
      <div className="panel-heading panel-heading--with-badge">
        <div>
          <h2>Descargar reporte</h2>
          <p>Exporta las citas del rango seleccionado</p>
        </div>
        <span className="phase-badge">FASE 2</span>
      </div>

      <div className="export-report-form">
        <div className="field">
          <label className="field__label">Rango</label>
          <div className="field__input field__input--readonly">
            📅 {rangeLabel || `${from} – ${to}`}
          </div>
        </div>

        <div className="export-field-row">
          <div className="field">
            <label className="field__label">Especialidad</label>
            <select
              className="field__select"
              value={specialty}
              onChange={(e) => setSpecialty((e.target.value as Specialty) || '')}
            >
              <option value="">Todas</option>
              {SPECIALTIES.map((spec) => (
                <option key={spec} value={spec}>
                  {spec.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label">Estado</label>
            <select
              className="field__select"
              value={status}
              onChange={(e) => setStatus((e.target.value as AppointmentFilterStatus) || '')}
            >
              <option value="">Todas</option>
              <option value="ACTIVE">Activas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field__label">Formato</label>
          <div className="format-toggle-group">
            <button
              type="button"
              className={`format-toggle ${format === 'csv' ? 'is-selected' : ''}`}
              onClick={() => setFormat('csv')}
            >
              CSV
            </button>
            <button
              type="button"
              className={`format-toggle ${format === 'xlsx' ? 'is-selected' : ''}`}
              onClick={() => setFormat('xlsx')}
            >
              Excel
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--wide btn--download"
          disabled={isDownloading}
          onClick={handleDownload}
        >
          {isDownloading ? 'Descargando…' : `📥 Descargar ${format.toUpperCase()}`}
        </button>

        <p className="export-footer-note">
          Columnas: paciente, email, especialidad, fecha, hora de inicio y fin, estado y fecha de creación.
        </p>
      </div>
    </article>
  );
}
