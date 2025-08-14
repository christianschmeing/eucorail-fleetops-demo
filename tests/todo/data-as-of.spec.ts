import { test, expect } from '@playwright/test';

test.skip('hud shows data as-of train count and statuses', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  await expect(page.getByTestId('train-count')).toHaveText(/^[1-9][0-9]*$/);
});


