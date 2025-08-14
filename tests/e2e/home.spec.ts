import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Home renders map and receives live updates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i);
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('map-status')).toHaveText(/ready|loading…/i);
  await expect(page.getByTestId('train-count')).toHaveText(/^[0-9]+$/);
  const golden = test.info().snapshotPath('home-initial.png');
  if (process.env.CI && !existsSync(golden)) test.skip();
  await expect(page).toHaveScreenshot('home-initial.png', { animations: 'disabled', fullPage: false });
});


