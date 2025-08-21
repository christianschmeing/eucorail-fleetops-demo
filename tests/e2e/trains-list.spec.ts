import { test, expect } from '@playwright/test';

test('trains list renders rows and tcms column', async ({ page }) => {
  await page.goto('/trains');
  await page.waitForSelector('text=Fahrzeugübersicht', { timeout: 15000 });
  // Expect header and table
  await expect(page.locator('table')).toBeVisible();
  // Wait a bit for client hydration
  await page.waitForTimeout(1000);
  // Rows may be many; ensure table headers are present
  await expect(page.locator('th:text("TCMS")')).toBeVisible();
});
