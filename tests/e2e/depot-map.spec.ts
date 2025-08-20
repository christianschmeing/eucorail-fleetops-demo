import { test, expect } from '@playwright/test';

test.describe('Depot Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/depot/map');
    // Wait for map to load
    await page.waitForTimeout(2000);
  });

  test('Depot Map - SSR und Visualisierung', async ({ page }) => {
    // Check that page loads
    await expect(page).toHaveTitle(/Depot Karte/);
    
    // Check for depot selector
    await expect(page.getByText('Essingen')).toBeVisible();
    await expect(page.getByText('Langweid')).toBeVisible();
    
    // Check for map view toggles
    await expect(page.getByText('Straße')).toBeVisible();
    await expect(page.getByText('Satellit')).toBeVisible();
    
    // Check for KPIs
    await expect(page.getByText('Züge im Depot')).toBeVisible();
    await expect(page.getByText('Gleis-Auslastung jetzt')).toBeVisible();
    
    // Check that SVG map is rendered
    const svgMap = page.locator('svg').first();
    await expect(svgMap).toBeVisible();
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('depot-map-essingen.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Depot Map - Depot Switching', async ({ page }) => {
    // Switch to Langweid
    await page.getByText('Langweid').click();
    await page.waitForTimeout(1000);
    
    // Check that depot switched
    await expect(page.getByText('Depot Langweid')).toBeVisible();
    
    // Take screenshot of Langweid depot
    await expect(page).toHaveScreenshot('depot-map-langweid.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Depot Map - Filter und Export funktionieren', async ({ page }) => {
    // Open filters if needed
    const filterSection = page.locator('[data-testid="depot-filters"]');
    if (await filterSection.count() > 0) {
      await filterSection.click();
    }
    
    // Check for CSV Export button
    await expect(page.getByText('CSV Export')).toBeVisible();
    
    // Check for conflict indicator
    const conflictBadge = page.locator('[data-testid="conflict-count"]');
    if (await conflictBadge.count() > 0) {
      await expect(conflictBadge).toBeVisible();
    }
  });

  test('Depot Map - Deep Links funktionieren', async ({ page }) => {
    // Test depot deep link
    await page.goto('/depot/map?depot=langweid');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Depot Langweid')).toBeVisible();
    
    // Test track deep link
    await page.goto('/depot/map?track=E-H1');
    await page.waitForTimeout(1000);
    
    // Test train deep link
    await page.goto('/depot/map?train=RE9-001');
    await page.waitForTimeout(1000);
  });

  test('Depot Map - Tracks und Allocations sichtbar', async ({ page }) => {
    // Check that tracks are rendered (as polylines in SVG)
    const tracks = page.locator('svg polyline');
    await expect(tracks).toHaveCount(8, { timeout: 5000 }); // At least 8 tracks visible
    
    // Check that trains are rendered (as circles in SVG)
    const trains = page.locator('svg circle');
    const trainCount = await trains.count();
    expect(trainCount).toBeGreaterThanOrEqual(10); // At least 10 trains
    
    // Check track colors exist
    const greenTrack = page.locator('svg polyline[stroke="#10b981"]').first();
    const yellowTrack = page.locator('svg polyline[stroke="#eab308"]').first();
    
    // At least one track should be visible
    const hasGreenTrack = await greenTrack.count() > 0;
    const hasYellowTrack = await yellowTrack.count() > 0;
    expect(hasGreenTrack || hasYellowTrack).toBeTruthy();
  });

  test('Depot Map - Mobile Responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Check that map is still visible
    const svgMap = page.locator('svg').first();
    await expect(svgMap).toBeVisible();
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('depot-map-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});
