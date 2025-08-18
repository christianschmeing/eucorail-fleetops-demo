import { test, expect } from '@playwright/test';

test('home renders header and map root', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('header-bar')).toBeVisible();
  await expect(page.getByTestId('map-root')).toBeVisible();
});
