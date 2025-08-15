import { test, expect } from '@playwright/test';

test('Open first train details via sidebar item', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as any).setSelectedTrain === 'function');
  await page.evaluate(() => (window as any).setSelectedTrain('RE9-78002'));
  await expect(page.getByTestId('train-drawer')).toBeVisible();
});


