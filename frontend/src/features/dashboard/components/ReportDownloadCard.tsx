'use client';

import { useState } from 'react';
import type { Specialty, AppointmentFilterStatus } from '@/types/api';
import type { DateRange } from '@/features/dashboard/utils/dateRanges';
import { downloadReport } from '@/lib/api/reports';
import { ApiRequestError } from '@/lib/api/client';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface ReportDownloadCardProps {
  defaultRange: DateRange;
  defaultSpecialty?: Specialty;
}

const SPECIALTIES = [
  { value: '', label: 'Todas las especialidades' },
  { value: 'MEDICINA_GENERAL', label: 'Medicina General' },
  { value: 'PEDIATRIA', label: 'Pediatría' },
  { value: 'CARDIOLOGIA', label: 'Cardiología' },
  { value: 'DERMATOLOGIA', label: 'Dermatología' },
];

const STATUSES = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
];

export default function ReportDownloadCard({ defaultRange, defaultSpecialty }: ReportDownloadCardProps) {
  const [specialty, setSpecialty] = useState<Specialty | ''>(defaultSpecialty ?? '');
  const [status, setStatus] = useState<AppointmentFilterStatus | 'ALL'>('ALL');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await downloadReport({
        from: defaultRange.from,
        to: defaultRange.to,
        specialty: specialty === '' ? undefined : specialty,
        status: status as AppointmentFilterStatus,
        format,
      });
    } catch (error) {
      const msg = error instanceof ApiRequestError ? error.message : 'Error de conexión. Verifica tu red.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h2 className="dashboard-card__title">Descargar reporte</h2>
      </div>
      
      <div className="flex flex-col gap-4">
        <Select
          label="Especialidad"
          options={SPECIALTIES}
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value as Specialty | '')}
          disabled={isLoading}
        />
        
        <Select
          label="Estado"
          options={STATUSES}
          value={status}
          onChange={(e) => setStatus(e.target.value as AppointmentFilterStatus | 'ALL')}
          disabled={isLoading}
        />
        
        <Select
          label="Formato"
          options={FORMATS}
          value={format}
          onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}
          disabled={isLoading}
        />

        {errorMsg && (
          <div className="field__error mt-1">
            {errorMsg}
          </div>
        )}

        <Button 
          onClick={handleDownload} 
          disabled={isLoading} 
          variant="primary" 
          className="mt-2 w-full justify-center"
        >
          {isLoading ? (
            <>
              <Spinner /> Descargando...
            </>
          ) : (
            `Descargar ${format === 'csv' ? 'CSV' : 'Excel'}`
          )}
        </Button>
      </div>
    </div>
  );
}
