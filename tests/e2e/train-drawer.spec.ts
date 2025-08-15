import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';

test('Open first train details via sidebar item', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const firstItem = page.getByTestId('train-item').first();
  await firstItem.click();
  await page.waitForFunction(() => (window as any).__selectedTrain || document.querySelector('[data-testid="train-drawer"]'));
  await expect(page.getByTestId('train-drawer')).toBeVisible();
});


