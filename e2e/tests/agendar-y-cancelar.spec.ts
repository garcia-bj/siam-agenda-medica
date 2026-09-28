import { expect, test } from '@playwright/test';
import { at, capture, chooseSpecialtyAndDay, createAppointment, nextBusinessDay } from './helpers';

// Flujo del PRD: seleccionar fecha → agendar → ver la cita en la lista → cancelar.
test('agendar una cita, verla en /citas y cancelarla', async ({ page }) => {
  const day = nextBusinessDay();

  await page.goto('/');
  await chooseSpecialtyAndDay(page, 'Pediatría', day);
  await page.getByRole('button', { name: '09:00, libre' }).click();
  await page.getByLabel('Nombre del paciente').fill('Ana Pérez');
  await page.getByLabel('Email').fill('ana.perez@correo.com');
  await capture(page, '01-agendar-formulario-completo');

  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(page.getByText('Cita confirmada')).toBeVisible();
  await expect(page.getByRole('button', { name: '09:00, ocupado' })).toBeDisabled();
  await capture(page, '02-agendar-cita-confirmada');

  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Citas' }).click();
  const row = page.getByRole('row', { name: /Ana Pérez/ });
  await expect(row).toContainText('09:00');
  await expect(row).toContainText('Pediatría');
  await capture(page, '03-citas-lista-con-la-cita');

  await row.getByRole('button', { name: 'Cancelar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancelar cita' });
  await expect(dialog).toContainText('Ana Pérez');
  await capture(page, '04-citas-modal-cancelar');
  await dialog.getByRole('button', { name: 'Sí, cancelar cita' }).click();

  await expect(page.getByText('Cita cancelada con éxito')).toBeVisible();
  await expect(row).toHaveCount(0);
  await capture(page, '05-citas-cita-cancelada');

  // El horario vuelve a quedar libre.
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Agendar cita' }).click();
  await chooseSpecialtyAndDay(page, 'Pediatría', day);
  await expect(page.getByRole('button', { name: '09:00, libre' })).toBeEnabled();
});

// Antioverbooking desde la pantalla: otra persona reserva el mismo horario mientras se llena el formulario.
test('si el horario se ocupa mientras se llena el formulario, avisa y actualiza la grilla', async ({ page, request }) => {
  const day = nextBusinessDay();

  await page.goto('/');
  await chooseSpecialtyAndDay(page, 'Cardiología', day);
  await page.getByRole('button', { name: '09:30, libre' }).click();
  await page.getByLabel('Nombre del paciente').fill('Carla Quispe');
  await page.getByLabel('Email').fill('carla@correo.com');

  await createAppointment(request, {
    patientName: 'Otra Recepcionista',
    patientEmail: 'otra@correo.com',
    specialty: 'CARDIOLOGIA',
    startTime: at(day, '09:30'),
  });

  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(page.getByText('Ese horario acaba de ser tomado')).toBeVisible();
  await expect(page.getByRole('button', { name: '09:30, ocupado' })).toBeDisabled();
  await capture(page, '06-agendar-horario-tomado-409');
});
