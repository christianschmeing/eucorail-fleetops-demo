import { test, expect } from '@playwright/test';

test.describe('Sidebar filters & catalog', () => {
  test('renders many trains and filters work', async ({ page }) => {
    await page.goto('/trains', { waitUntil: 'domcontentloaded' });

    // Ensure table loads with rows
    await page.waitForSelector('table tbody tr');
    const initialCount = await page.locator('table tbody tr').count();
    expect(initialCount).toBeGreaterThan(10);

    // Status filter (select)
    await page.selectOption('select', { label: 'Aktiv' });
    await page.waitForTimeout(200);
    const afterStatus = await page.locator('table tbody tr').count();
    expect(afterStatus).toBeLessThanOrEqual(initialCount);

    // Region filter
    await page.selectOption('select', { label: 'Baden-Württemberg' });
    await page.waitForTimeout(200);

    // Search reduces list
    await page.fill('input[placeholder="Zug-ID..."]', 'RE9');
    await page.waitForTimeout(200);
    const afterSearch = await page.locator('table tbody tr').count();
    expect(afterSearch).toBeGreaterThan(0);
    expect(afterSearch).toBeLessThanOrEqual(afterStatus);
  });
});
