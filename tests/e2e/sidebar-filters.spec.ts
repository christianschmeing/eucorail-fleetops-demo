import { test, expect } from '@playwright/test';

test.describe('Sidebar filters & catalog', () => {
  test('renders >100 trains and filters work', async ({ page }) => {
    const base = 'http://localhost:3001';
    await page.goto(base, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="sidebar"]');

    // Ensure API reachable and catalog big enough
    const count = await page.evaluate(async () => {
      const r = await fetch('/api/trains');
      if (!r.ok) throw new Error('api/trains failed: ' + r.status);
      const arr = await r.json();
      return Array.isArray(arr) ? arr.length : 0;
    });
    expect(count).toBeGreaterThan(100);

    // Wait until UI lists >100 items (catalog merged)
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="train-item"]').length > 100, null, { timeout: 60000 });
    const total = await page.locator('[data-testid="train-item"]').count();
    expect(total).toBeGreaterThan(100);

    // Status filter
    await page.waitForSelector('[role="group"][aria-label="Status"]', { state: 'visible', timeout: 30000 });
    const statusGroup = page.getByRole('group', { name: 'Status' });
    await expect(statusGroup).toBeVisible({ timeout: 30000 });
    await statusGroup.getByRole('button', { name: 'maintenance' }).click();
    await page.waitForTimeout(200);
    const afterStatus = await page.locator('[data-testid="train-item"]').count();
    expect(afterStatus).toBeLessThan(total);

    // Region filter (if present)
    await page.waitForSelector('[role="group"][aria-label="Region"]', { state: 'visible', timeout: 30000 });
    const regionGroup = page.getByRole('group', { name: 'Region' });
    await expect(regionGroup).toBeVisible({ timeout: 30000 });
    const regionButtons = await regionGroup.getByRole('button').allTextContents();
    if (regionButtons.includes('BW')) {
      await regionGroup.getByRole('button', { name: 'BW' }).click();
    }
    if (regionButtons.includes('BY')) {
      await regionGroup.getByRole('button', { name: 'BY' }).click();
    }

    // Search reduces list
    const search = page.getByPlaceholder('Suchen… (ID, Linie)');
    await search.fill('RE9');
    await page.waitForTimeout(200);
    const afterSearch = await page.locator('[data-testid="train-item"]').count();
    expect(afterSearch).toBeGreaterThan(0);
    expect(afterSearch).toBeLessThan(total);
  });
});
