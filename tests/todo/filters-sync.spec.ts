import { test, expect } from '@playwright/test';

test.skip('line filter buttons update list', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  const list = page.getByTestId('train-list');
  await expect(list).toBeVisible();
});


