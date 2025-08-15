import { test, expect } from '@playwright/test';

test('@smoke KPI header visible on home', async ({ page }) => {
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  // Wait for client-side MapShell to render
  await expect(page.getByTestId('map-root')).toBeVisible();
  await expect(page.getByTestId('kpi-availability')).toBeVisible();
  await expect(page.getByTestId('kpi-delay')).toBeVisible();
  await expect(page.getByTestId('kpi-faults')).toBeVisible();
});
