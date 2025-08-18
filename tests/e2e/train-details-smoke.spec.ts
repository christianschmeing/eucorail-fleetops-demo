import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('@smoke train details page shows timeline and wartung tab', async ({ page }) => {
  await page.goto('/trains/780', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('text=/Wartungs-Timeline/i', { timeout: 30000 });
  await expect(page.getByText(/Wartungs-Timeline/i)).toBeVisible({ timeout: 30000 });
  await page.getByRole('tab', { name: /WARTUNG/ }).click();
  const panel = page.getByTestId('train-details-panel');
  await expect(panel.getByText(/Bremsen-Check/i)).toBeVisible();
});
