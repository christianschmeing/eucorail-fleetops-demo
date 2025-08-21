import { test, expect } from '@playwright/test';

test.describe('@ci basic smoke', () => {
  test('@ci home shows hero and nav links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByAltText('Eucorail')).toBeVisible();
    await expect(page.getByText('FleetOps Instandhaltungsplattform')).toBeVisible();
    await expect(page.getByRole('link', { name: /View Live Fleet Map/i })).toBeVisible();
  });

  test('@ci lines summary and csv export present', async ({ page }) => {
    await page.goto('/lines', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Linienübersicht')).toBeVisible();
    await expect(page.getByText('Gesamt Fahrzeuge')).toBeVisible();
    await expect(page.getByText('CSV-Export')).toBeVisible();
  });

  test('@ci api health ok', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.ok()).toBeTruthy();
    const j = await r.json();
    expect(j.status || j.ok).toBeTruthy();
  });
});
