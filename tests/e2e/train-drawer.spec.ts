import { test, expect } from '@playwright/test';

test('Open first train details via sidebar item', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const firstItem = page.getByTestId('train-item').first();
  await firstItem.scrollIntoViewIfNeeded();
  // Programmatic click to avoid rare overlay intercepts in CI
  await firstItem.evaluate((el) => (el as HTMLElement).click());
  await page.waitForFunction(() => (window as any).__selectedTrain || document.querySelector('[data-testid="train-drawer"]'));
  await expect(page.getByTestId('train-drawer')).toBeVisible();
});


