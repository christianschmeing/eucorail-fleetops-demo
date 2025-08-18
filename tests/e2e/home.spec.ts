import { test, expect } from '@playwright/test';

test('Home renders header and map root', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('header-bar')).toBeVisible();
  await expect(page.getByTestId('map-root')).toBeVisible();
});
