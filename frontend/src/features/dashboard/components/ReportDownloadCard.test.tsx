import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportDownloadCard from './ReportDownloadCard';
import { downloadReport } from '@/lib/api/reports';
import { ApiRequestError } from '@/lib/api/client';

// Mock API
vi.mock('@/lib/api/reports', () => ({
  downloadReport: vi.fn(),
}));

describe('ReportDownloadCard', () => {
  const defaultProps = {
    defaultRange: { from: '2023-10-01', to: '2023-10-31', businessDays: 22 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and calls downloadReport with default values', async () => {
    render(<ReportDownloadCard {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /Descargar CSV/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(downloadReport).toHaveBeenCalledWith({
        from: '2023-10-01',
        to: '2023-10-31',
        specialty: undefined,
        status: 'ALL',
        format: 'csv',
      });
    });
  });

  it('updates parameters and calls API accordingly', async () => {
    render(<ReportDownloadCard {...defaultProps} />);
    
    fireEvent.change(screen.getByLabelText(/Especialidad/i), { target: { value: 'PEDIATRIA' } });
    fireEvent.change(screen.getByLabelText(/Estado/i), { target: { value: 'ACTIVE' } });
    fireEvent.change(screen.getByLabelText(/Formato/i), { target: { value: 'xlsx' } });
    
    const button = screen.getByRole('button', { name: /Descargar Excel/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(downloadReport).toHaveBeenCalledWith({
        from: '2023-10-01',
        to: '2023-10-31',
        specialty: 'PEDIATRIA',
        status: 'ACTIVE',
        format: 'xlsx',
      });
    });
  });

  it('shows loading state while downloading', async () => {
    let resolvePromise: (value: void | PromiseLike<void>) => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(downloadReport).mockReturnValue(promise);

    render(<ReportDownloadCard {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /Descargar CSV/i });
    fireEvent.click(button);
    
    expect(screen.getByText(/Descargando.../i)).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    resolvePromise!();
    
    await waitFor(() => {
      expect(button).not.toBeDisabled();
      expect(screen.queryByText(/Descargando.../i)).not.toBeInTheDocument();
    });
  });

  it('displays API error message on failure', async () => {
    vi.mocked(downloadReport).mockRejectedValue(
      new ApiRequestError(500, 'INTERNAL_ERROR', 'Error interno al generar reporte', [])
    );

    render(<ReportDownloadCard {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Descargar CSV/i }));
    
    expect(await screen.findByText('Error interno al generar reporte')).toBeInTheDocument();
  });

  it('displays generic error message on network failure', async () => {
    vi.mocked(downloadReport).mockRejectedValue(new Error('Network error'));

    render(<ReportDownloadCard {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Descargar CSV/i }));
    
    expect(await screen.findByText('Error de conexión. Verifica tu red.')).toBeInTheDocument();
  });
});
