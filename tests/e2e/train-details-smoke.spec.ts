import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('@smoke train details page shows timeline and wartung tab', async ({ page }) => {
  await page.goto('/trains/780', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Wartungs-Timeline/i)).toBeVisible();
  await page.getByRole('tab', { name: /WARTUNG/ }).click();
  await expect(page.getByText(/Bremsen-Check/i)).toBeVisible();
});


