import { test, expect } from '@playwright/test';

test('Home shows hero and navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByAltText('Eucorail')).toBeVisible();
  await expect(page.getByText('FleetOps Instandhaltungsplattform')).toBeVisible();
  await expect(page.getByRole('link', { name: /View Live Fleet Map/i })).toBeVisible();
});
