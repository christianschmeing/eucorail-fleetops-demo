import { test, expect } from '@playwright/test';

test.describe('144 Züge Vollabdeckung - SSR Validation', () => {
  
  test('Dashboard - Deutsche Lokalisierung & 144 Flottengröße', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe deutsche Texte
    await expect(page.locator('h1')).toContainText('Eucorail FleetOps Dashboard');
    await expect(page.locator('text=Flottengröße')).toBeVisible();
    
    // Prüfe Flottengröße = 144
    const fleetSizeElement = page.locator('text=Flottengröße').locator('..').locator('text=144').first();
    await expect(fleetSizeElement).toBeVisible();
    
    // Prüfe Statusverteilung
    const statusSection = page.locator('text=Fahrzeugstatus-Verteilung').locator('..');
    await expect(statusSection).toBeVisible();
    
    // Prüfe deutsche CTAs
    await expect(page.locator('text=Wartung öffnen')).toBeVisible();
    await expect(page.locator('text=Live-Karte anzeigen')).toBeVisible();
  });

  test('Trains - 144 Einträge im SSR', async ({ page }) => {
    await page.goto('/trains');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe 144 Einträge
    await expect(page.locator('text=144 Einträge')).toBeVisible();
    
    // Prüfe Tabelle ist sichtbar (SSR)
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Prüfe erste Zeile
    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // Prüfe CSV-Export Button
    await expect(page.locator('text=CSV-Export')).toBeVisible();
  });

  test('Maintenance - 3 Widgets mit 144-Bezug', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Flottenabdeckung
    await expect(page.locator('text=Flottenabdeckung')).toBeVisible();
    await expect(page.locator('text=/144\\/144 Züge/')).toBeVisible();
    
    // Prüfe Offene Arbeitsaufträge Widget
    await expect(page.locator('text=Offene Arbeitsaufträge (heute)')).toBeVisible();
    await expect(page.locator('text=/Betroffene Züge:.*\\/144/')).toBeVisible();
    
    // Prüfe Kapazität Widget
    await expect(page.locator('text=Kapazität (nächste 7 Tage)')).toBeVisible();
    await expect(page.locator('text=/≥144/')).toBeVisible();
    
    // Prüfe Teile mit Risiko Widget
    await expect(page.locator('text=Teile mit Risiko')).toBeVisible();
    const riskSection = page.locator('text=Teile mit Risiko').locator('..');
    await expect(riskSection.locator('text=/\\/144/')).toBeVisible();
  });

  test('Log - ≥144 Events mit allen Zug-IDs', async ({ page }) => {
    await page.goto('/log');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Ereignisse ≥144
    const eventsCount = page.locator('text=Gesamtereignisse').locator('..').locator('.text-2xl');
    const count = await eventsCount.textContent();
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(144);
    
    // Prüfe Abdeckung 144/144 Züge
    await expect(page.locator('text=144 von 144 Zügen')).toBeVisible();
    
    // Prüfe Tabelle ist sichtbar (SSR)
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Prüfe CSV-Export
    await expect(page.locator('text=CSV-Export')).toBeVisible();
  });

  test('Lines - Eucorail Branding & Summe = 144', async ({ page }) => {
    await page.goto('/lines');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Gesamt Fahrzeuge = 144
    const totalVehicles = page.locator('text=Gesamt Fahrzeuge').locator('..').locator('text=144').first();
    await expect(totalVehicles).toBeVisible();
    
    // Prüfe Konsistenz-Check
    await expect(page.locator('text=✓ Konsistent (144)')).toBeVisible();
    
    // Prüfe Eucorail in Tabelle (kein Arverio)
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Prüfe dass kein "Arverio" vorkommt
    const arverioCount = await page.locator('text=Arverio').count();
    expect(arverioCount).toBe(0);
    
    // Prüfe dass "Eucorail" vorkommt
    const eucorailCount = await page.locator('text=Eucorail').count();
    expect(eucorailCount).toBeGreaterThan(0);
    
    // Prüfe Summenzeile
    await expect(page.locator('tr').filter({ hasText: 'Gesamt' }).locator('text=144')).toBeVisible();
  });

  test('Map - KPI-Leiste zeigt 144', async ({ page }) => {
    // Skip if map loads slowly
    test.setTimeout(30000);
    
    await page.goto('/map');
    await page.waitForLoadState('domcontentloaded');
    
    // Warte auf Map-Container
    await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 }).catch(() => {
      // Map might not load in test environment
    });
    
    // Prüfe KPI-Leiste
    const fleetSizeKpi = page.locator('text=Flottengröße').locator('..').locator('text=144').first();
    await expect(fleetSizeKpi).toBeVisible();
    
    // Prüfe Gesamt (gefiltert) ohne Filter = 144
    const totalFiltered = page.locator('text=Gesamt (gefiltert)').locator('..').locator('div').filter({ hasText: /^\d+$/ }).first();
    await expect(totalFiltered).toHaveText('144');
  });

  test('Konsistenz K1 - Flottengröße überall 144', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    const dashboardFleet = await page.locator('text=Flottengröße').locator('..').locator('text=144').first().textContent();
    expect(dashboardFleet).toBe('144');
    
    // Trains
    await page.goto('/trains');
    await expect(page.locator('text=144 Einträge')).toBeVisible();
    
    // Lines
    await page.goto('/lines');
    const linesTotal = await page.locator('text=Gesamt Fahrzeuge').locator('..').locator('text=144').first().textContent();
    expect(linesTotal).toBe('144');
  });
});
