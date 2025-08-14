import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Open first train details (test-mode list) via button', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  await expect(page.getByTestId('train-count')).toHaveText(/^[1-9][0-9]*$/, { timeout: 15000 });
  await expect(page.getByTestId('train-count')).toHaveText(/^[1-9][0-9]*$/);
  // Deterministic selection via TestHUD button
  const hudBtn = page.getByTestId('hud-open-details').first();
  await hudBtn.click();
  await page.waitForFunction(() => (window as any).__selectedTrain || document.querySelector('[data-testid="train-drawer"]'));
  await expect(page.getByTestId('train-drawer')).toBeVisible();
  const golden = test.info().snapshotPath('drawer-open.png');
  if (!existsSync(golden)) test.skip();
  await expect(page.getByTestId('train-drawer')).toHaveScreenshot('drawer-open.png', { animations: 'disabled' });
});


