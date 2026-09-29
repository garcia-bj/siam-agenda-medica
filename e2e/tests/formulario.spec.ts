import { expect, test } from '@playwright/test';
import { capture, chooseSpecialtyAndDay, nextBusinessDay } from './helpers';

// El PRD pide prevenir datos inválidos ANTES de enviar: no debe salir ninguna petición a la API.
test('el formulario valida nombre y email sin llamar a la API', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/appointments')) posts.push(req.url());
  });

  await page.goto('/');
  await chooseSpecialtyAndDay(page, 'Medicina General', nextBusinessDay());
  await page.getByRole('button', { name: '10:30, libre' }).click();

  await page.getByRole('button', { name: 'Confirmar cita' }).click();
  await expect(page.getByText('El nombre debe tener al menos 2 caracteres')).toBeVisible();
  await expect(page.getByText('El email es obligatorio')).toBeVisible();
  await capture(page, '09-formulario-campos-vacios');

  await page.getByLabel('Nombre del paciente').fill('Ana');
  await page.getByLabel('Email').fill('ana@');
  await page.getByRole('button', { name: 'Confirmar cita' }).click();
  await expect(page.getByText('Ingresa un email válido')).toBeVisible();
  await capture(page, '10-formulario-email-invalido');

  expect(posts).toHaveLength(0);
});
