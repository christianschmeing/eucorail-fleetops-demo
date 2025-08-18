import { test, expect } from '@playwright/test';

test.skip('train markers visible and count >= 1', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  await expect(page.getByTestId('train-count')).toHaveText(/^[1-9][0-9]*$/, { timeout: 15000 });
});
