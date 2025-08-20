import { test, expect } from '@playwright/test';

test('home renders hero and CTA', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByAltText('Eucorail')).toBeVisible();
  await expect(page.getByText('FleetOps Instandhaltungsplattform')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open Maintenance Center/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /View Live Fleet Map/ })).toBeVisible();
});
