import { test, expect } from '@playwright/test';

test('@smoke KPI header visible on home', async ({ page }) => {
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  // Gate on existing HUD readiness used elsewhere
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  await expect(page.getByTestId('kpi-availability')).toBeVisible();
  await expect(page.getByTestId('kpi-delay')).toBeVisible();
  await expect(page.getByTestId('kpi-faults')).toBeVisible();
});
