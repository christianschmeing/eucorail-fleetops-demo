import { test, expect } from '@playwright/test';

test.skip('drawer shows technical details placeholders', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  await page.getByTestId('hud-open-details').first().click();
  await expect(page.getByTestId('train-drawer')).toBeVisible();
});
