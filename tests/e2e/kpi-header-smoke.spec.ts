import { test, expect } from '@playwright/test';

test('@smoke KPI header visible on home', async ({ page }) => {
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  // Header should render immediately with client shell
  await expect(page.getByText(/Eucorail FleetOps/i)).toBeVisible({ timeout: 20000 });
});
