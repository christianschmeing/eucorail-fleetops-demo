import { test, expect } from '@playwright/test';

test.describe('144 Züge Vollabdeckung', () => {
  test('Dashboard zeigt Flottengröße 144', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Warte auf SSR-Content
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Flottengröße
    const fleetSize = await page.locator('text=Flottengröße').locator('..').locator('text=144').first();
    await expect(fleetSize).toBeVisible();
    
    // Prüfe SSOT-Badge
    const ssotBadge = await page.locator('text=SSOT').first();
    await expect(ssotBadge).toBeVisible();
    
    // Prüfe Konsistenz-Check
    const consistencyCheck = await page.locator('text=/= 144/').first();
    await expect(consistencyCheck).toBeVisible();
  });

  test('Map zeigt 144 Gesamt (ungefiltert)', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe KPI-Leiste
    const totalKpi = await page.locator('text=Gesamt (gefiltert)').locator('..').locator('text=144').first();
    await expect(totalKpi).toBeVisible();
    
    // Prüfe "von 144" Text
    const ofTotal = await page.locator('text=/von 144/').first();
    await expect(ofTotal).toBeVisible();
  });

  test('Lines-Seite: Summe Fahrzeuge = 144', async ({ page }) => {
    await page.goto('/lines');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Gesamt-KPI
    const totalVehicles = await page.locator('text=Gesamt Fahrzeuge').locator('..').locator('text=144').first();
    await expect(totalVehicles).toBeVisible();
    
    // Prüfe Konsistenz-Indikator
    const consistency = await page.locator('text=✓ Konsistent (144)').first();
    await expect(consistency).toBeVisible();
    
    // Prüfe Summenzeile
    const sumRow = await page.locator('tr:has-text("Gesamt")').locator('text=144');
    await expect(sumRow).toBeVisible();
  });

  test('Trains-Seite zeigt 144 Einträge', async ({ page }) => {
    await page.goto('/trains');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Header-Anzeige
    const entriesText = await page.locator('text=144 Einträge').first();
    await expect(entriesText).toBeVisible();
    
    // Prüfe Paginierung (sollte mehrere Seiten haben bei 20 pro Seite)
    const pagination = await page.locator('text=/von 144/').first();
    await expect(pagination).toBeVisible();
  });

  test('Maintenance zeigt Coverage 144/144', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Flottenabdeckung
    const coverage = await page.locator('text=144/144').first();
    await expect(coverage).toBeVisible();
    
    // Prüfe 100% Abdeckung
    const fullCoverage = await page.locator('text=100% Abdeckung').first();
    await expect(fullCoverage).toBeVisible();
    
    // Prüfe "betroffene Züge" Counter
    const affectedTrains = await page.locator('text=/von 144 Zügen/').first();
    await expect(affectedTrains).toBeVisible();
  });

  test('ECM-Hub zeigt 144 Bezug in allen Widgets', async ({ page }) => {
    await page.goto('/ecm');
    await page.waitForLoadState('domcontentloaded');
    
    // ECM-1: Policies
    const ecm1Coverage = await page.locator('text=Policies zugewiesen:').locator('..').locator('text=144/144');
    await expect(ecm1Coverage).toBeVisible();
    
    // ECM-2: Wartungsprogramme
    const ecm2Coverage = await page.locator('text=Wartungsprogramme zugewiesen:').locator('..').locator('text=144/144');
    await expect(ecm2Coverage).toBeVisible();
    
    // ECM-3: Planner
    const ecm3Coverage = await page.locator('text=Geplante Züge (7 T):').locator('..').locator('text=≥144');
    await expect(ecm3Coverage).toBeVisible();
    
    // ECM-4: Delivery
    const ecm4Coverage = await page.locator('text=Abdeckung (30 T):').locator('..').locator('text=144/144 Züge');
    await expect(ecm4Coverage).toBeVisible();
    
    // Gesamtstatus
    const totalManaged = await page.locator('text=Züge verwaltet').locator('..').locator('text=144');
    await expect(totalManaged).toBeVisible();
  });

  test('Log enthält ≥144 Events und alle Zug-IDs', async ({ page }) => {
    await page.goto('/log');
    await page.waitForLoadState('domcontentloaded');
    
    // Prüfe Gesamtereignisse
    const totalEvents = await page.locator('text=Gesamtereignisse').locator('..');
    const eventCount = await totalEvents.locator('text=/\\d+/').textContent();
    expect(parseInt(eventCount || '0')).toBeGreaterThanOrEqual(144);
    
    // Prüfe abgedeckte Züge
    const coveredTrains = await page.locator('text=/144 von 144 Zügen/').first();
    await expect(coveredTrains).toBeVisible();
    
    // Prüfe "Alle Züge erfasst"
    const allTrainsCovered = await page.locator('text=✓ Alle Züge erfasst').first();
    await expect(allTrainsCovered).toBeVisible();
  });

  test('CSV-Exporte validieren', async ({ page }) => {
    // Trains Export
    await page.goto('/trains');
    await page.waitForLoadState('domcontentloaded');
    const trainsExportBtn = await page.locator('button:has-text("CSV-Export")').first();
    const trainsExportText = await trainsExportBtn.textContent();
    expect(trainsExportText).toContain('144 Zeilen');
    
    // Lines Export
    await page.goto('/lines');
    await page.waitForLoadState('domcontentloaded');
    const linesExportBtn = await page.locator('button:has-text("CSV-Export")').first();
    await expect(linesExportBtn).toBeVisible();
    
    // Log Export
    await page.goto('/log');
    await page.waitForLoadState('domcontentloaded');
    const logExportBtn = await page.locator('button:has-text("CSV-Export")').first();
    const logExportText = await logExportBtn.textContent();
    expect(logExportText).toMatch(/\d+ Zeilen/);
  });

  test('Konsistenz zwischen Modulen (K1-K4)', async ({ page }) => {
    const values: Record<string, string> = {};
    
    // Dashboard Flottengröße
    await page.goto('/dashboard');
    const dashboardFleet = await page.locator('text=Flottengröße').locator('..').locator('div:has-text(/^\\d+$/)').first().textContent();
    values.dashboard = dashboardFleet || '';
    
    // Map Gesamt
    await page.goto('/map');
    const mapTotal = await page.locator('text=Gesamt (gefiltert)').locator('..').locator('div:has-text(/^\\d+$/)').first().textContent();
    values.map = mapTotal || '';
    
    // Trains Gesamtanzahl
    await page.goto('/trains');
    const trainsMatch = await page.locator('text=/\\d+ Einträge/').first().textContent();
    values.trains = trainsMatch?.match(/(\d+)/)?.[1] || '';
    
    // Lines Summe
    await page.goto('/lines');
    const linesTotal = await page.locator('text=Gesamt Fahrzeuge').locator('..').locator('div:has-text(/^\\d+$/)').first().textContent();
    values.lines = linesTotal || '';
    
    // Alle Werte sollten 144 sein
    expect(values.dashboard).toBe('144');
    expect(values.map).toBe('144');
    expect(values.trains).toBe('144');
    expect(values.lines).toBe('144');
  });

  test('Deutsche Lokalisierung durchgängig', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('text=Flottengröße')).toBeVisible();
    await expect(page.locator('text=Verfügbarkeit')).toBeVisible();
    await expect(page.locator('text=Wartung öffnen')).toBeVisible();
    
    // Map
    await page.goto('/map');
    await expect(page.locator('text=Aktive')).toBeVisible();
    await expect(page.locator('text=In Wartung')).toBeVisible();
    await expect(page.locator('text=Filter zurücksetzen')).toBeVisible();
    
    // Keine englischen Reste
    const englishTerms = ['Fleet', 'Active', 'Maintenance', 'Total', 'Dashboard', 'Availability'];
    for (const term of englishTerms) {
      const elements = await page.locator(`text="${term}"`).count();
      expect(elements).toBe(0);
    }
  });
});
