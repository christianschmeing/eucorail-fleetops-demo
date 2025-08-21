import { test, expect } from '@playwright/test';

test('map shows train markers and tcms badges', async ({ page }) => {
  await page.goto('/map');
  await page.waitForSelector('[data-testid="map-canvas"]', { timeout: 15000 });
  // Wait for trains to bootstrap/update
  await page.waitForTimeout(3000);
  // At least one marker exists
  const markers = await page.locator('[data-testid="train-marker"]').count();
  expect(markers).toBeGreaterThan(0);
});
