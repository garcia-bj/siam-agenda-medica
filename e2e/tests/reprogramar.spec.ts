import { expect, test } from '@playwright/test';
import { at, capture, createAppointment, dayLabel, nextBusinessDay } from './helpers';

test('reprogramar una cita a otro horario desde /citas', async ({ page, request }) => {
  const day = nextBusinessDay();
  await createAppointment(request, {
    patientName: 'Luis Mamani',
    patientEmail: 'luis@correo.com',
    specialty: 'DERMATOLOGIA',
    startTime: at(day, '10:00'),
  });

  await page.goto('/citas');
  const row = page.getByRole('row', { name: /Luis Mamani/ });
  await expect(row).toContainText('10:00');
  await row.getByRole('button', { name: 'Reprogramar' }).click();

  const dialog = page.getByRole('dialog', { name: 'Reprogramar cita' });
  await dialog.getByRole('button', { name: dayLabel(day), exact: true }).click();
  await expect(dialog.getByRole('button', { name: '10:00, actual' })).toBeDisabled();
  await dialog.getByRole('button', { name: '11:00, libre' }).click();
  await capture(page, '07-citas-modal-reprogramar');
  await dialog.getByRole('button', { name: 'Guardar cambio' }).click();

  await expect(page.getByText('Cita reprogramada con éxito')).toBeVisible();
  await expect(row).toContainText('11:00');
  await capture(page, '08-citas-cita-reprogramada');
});
