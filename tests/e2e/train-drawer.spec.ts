import { test, expect } from '@playwright/test';

test('Open first train details via sidebar item', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const button = page.getByTestId('open-details').first();
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.waitForFunction(() => (window as any).__selectedTrain || document.querySelector('[data-testid="train-drawer"]'));
  await expect(page.getByTestId('train-drawer')).toBeVisible();
});


