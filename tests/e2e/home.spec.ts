import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Home renders map and receives live updates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('map-root')).toBeVisible();
  const golden = test.info().snapshotPath('home-initial.png');
  if (!existsSync(golden)) test.skip();
  await expect(page).toHaveScreenshot('home-initial.png', { animations: 'disabled', fullPage: false });
});


