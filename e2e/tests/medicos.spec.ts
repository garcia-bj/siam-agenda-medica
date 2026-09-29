import { test, expect } from '@playwright/test';

test.describe('Visibilidad de médicos', () => {
  test('muestra el médico asignado o aviso si no hay médico', async ({ page }) => {
    // Navigate to the app (uses baseUrl from playwright.config)
    await page.goto('/');
    
    // Wait for the UI to load
    await expect(page.getByRole('heading', { name: '1. Elige la fecha' })).toBeVisible();

    // The default specialty in the seed is 'Medicina General', let's click it to be sure
    await page.getByRole('button', { name: 'Medicina General' }).click();

    // Verify it says "Atiende: Dr. Martín Gutiérrez"
    await expect(page.getByText('Atiende: Dr. Martín Gutiérrez')).toBeVisible();
    
    // Select Dermatología
    await page.getByRole('button', { name: 'Dermatología' }).click();

    // Verify the no doctor warning is shown
    await expect(page.getByText('Esta especialidad no tiene médico disponible')).toBeVisible();

    // The interactive grid buttons for slots should not be visible for Dermatología
    await expect(page.getByRole('button', { name: /libre/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /ocupado/ })).not.toBeVisible();
  });
});
