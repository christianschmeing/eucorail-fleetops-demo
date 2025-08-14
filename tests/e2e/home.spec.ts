import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Home renders map and receives live updates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('sse-status')).toHaveText(/connected/i, { timeout: 45000 });
  await expect(page.getByTestId('map-status')).toHaveText(/ready/i, { timeout: 45000 });
  await expect(page.getByTestId('train-count')).toHaveText(/^[1-9][0-9]*$/, { timeout: 15000 });
  const golden = test.info().snapshotPath('home-initial.png');
  if (!existsSync(golden)) test.skip();
  await expect(page).toHaveScreenshot('home-initial.png', { animations: 'disabled', fullPage: false });
});


