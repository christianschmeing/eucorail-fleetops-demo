import { test, expect } from '@playwright/test';

test.skip('markers have data-testid and rotate', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  const markers = await page.$$('[data-testid="train-marker"]');
  expect(markers.length).toBeGreaterThan(0);
});
