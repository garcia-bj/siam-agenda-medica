import { expect, test } from '@playwright/test';
import { at, capture, createAppointment, nextBusinessDay } from './helpers';

// Medicina General no la usa ningún otro test, así que su médico no tiene citas próximas.
test('registrar un médico en una especialidad que quedó libre', async ({ page }) => {
  await page.goto('/medicos');
  const coverage = page.getByRole('region', { name: 'Cobertura por especialidad' });

  await page.getByRole('button', { name: 'Desactivar a Dr. Martín Gutiérrez' }).click();
  await page.getByRole('button', { name: 'Sí, desactivar' }).click();
  await expect(page.getByText('Médico desactivado')).toBeVisible();
  await expect(coverage.getByText('Sin médico activo')).toBeVisible();

  await page.getByRole('button', { name: 'Registrar médico' }).click();
  const dialog = page.getByRole('dialog', { name: 'Registrar médico' });
  await dialog.getByLabel('Nombre completo').fill('Dr. Tomás Ibáñez');
  await dialog.getByLabel('Especialidad', { exact: true }).selectOption('MEDICINA_GENERAL');
  await dialog.getByRole('button', { name: 'Registrar médico' }).click();

  await expect(page.getByText('Médico registrado')).toBeVisible();
  await expect(coverage.getByText('Dr. Tomás Ibáñez')).toBeVisible();
  await expect(coverage.getByText('Sin médico activo')).toHaveCount(0);
  await capture(page, '11-medicos-registrado');
});

// Regla del negocio: con citas próximas no se desactiva; hay que cancelarlas primero.
test('no deja desactivar a un médico con citas próximas', async ({ page, request }) => {
  await createAppointment(request, {
    patientName: 'Rosa Choque',
    patientEmail: 'rosa@correo.com',
    specialty: 'CARDIOLOGIA',
    startTime: at(nextBusinessDay(), '15:00'),
  });

  await page.goto('/medicos');
  const row = page.getByRole('row', { name: /Dr\. Ricardo Salazar/ });
  await expect(row).toContainText(/\d+ citas?/);
  await row.getByRole('button', { name: 'Desactivar a Dr. Ricardo Salazar' }).click();

  const dialog = page.getByRole('dialog', { name: 'No se puede desactivar' });
  await expect(dialog.getByRole('alert')).toContainText(/Dr\. Ricardo Salazar tiene \d+ citas? próximas? en Cardiología/);
  await expect(dialog.getByRole('button', { name: 'Sí, desactivar' })).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: 'Ir a Citas' })).toHaveAttribute('href', '/citas');
  await capture(page, '12-medicos-no-se-puede-desactivar');

  await dialog.getByRole('button', { name: 'Entendido' }).click();
  await expect(row).toContainText('Activo');
});
