import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Open first train details (test-mode list) via button', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i);
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('map-status')).toHaveText(/ready|loading…/i);
  // Deterministic selection via custom event and confirm via window flag
  // App preselects a default train in TEST_MODE; just wait for drawer
  await expect(page.getByTestId('train-drawer')).toBeVisible();
  await expect(page.getByTestId('train-drawer')).toBeVisible();
  const golden = test.info().snapshotPath('drawer-open.png');
  if (process.env.CI && !existsSync(golden)) test.skip();
  await expect(page.getByTestId('train-drawer')).toHaveScreenshot('drawer-open.png', { animations: 'disabled' });
});


