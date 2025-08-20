import { test, expect } from '@playwright/test';

test.describe('Visual: Home stable UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `
        *, *::before, *::after { transition: none !important; animation: none !important; }
      `,
    });
  });

  test('hero renders consistently', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByAltText('Eucorail')).toBeVisible();
    await expect(page.getByText('FleetOps Instandhaltungsplattform')).toBeVisible();
    await expect(page).toHaveScreenshot('home-stable.png', { fullPage: true });
  });
});
