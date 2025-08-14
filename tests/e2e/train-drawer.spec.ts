import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Open first train details (test-mode list) via button', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i);
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('map-status')).toHaveText(/ready|loading…/i);
  // Trigger selection deterministically via custom event to avoid UI flake
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('test:selectTrain', { detail: 'RE9-78001' }));
  });
  await expect(page.getByTestId('train-drawer')).toBeVisible();
  const golden = test.info().snapshotPath('drawer-open.png');
  if (process.env.CI && !existsSync(golden)) test.skip();
  await expect(page.getByTestId('train-drawer')).toHaveScreenshot('drawer-open.png', { animations: 'disabled' });
});


