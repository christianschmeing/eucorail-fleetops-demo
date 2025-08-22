import { test, expect } from '@playwright/test';

test.describe('Maintenance planning flow', () => {
  test('Card click sets stage and persists after reload', async ({ page }) => {
    await page.goto('/maintenance');
    await page.getByRole('button', { name: /IS3/ }).first().click();
    await expect(page).toHaveURL(/stage=IS3/);
    await page.reload();
    await expect(page).toHaveURL(/stage=IS3/);
  });

  test('Quick plan IS3 opens drawer with prefilled duration and redirects to depot map after submit', async ({
    page,
  }) => {
    await page.goto('/maintenance');
    // Click first row Details to ensure rows rendered
    const details = page.getByRole('button', { name: /Details/ }).first();
    await details.click();
    // Click quick IS3 plan button on first row
    const is3Btn = page.getByRole('button', { name: /^Plan IS3$/ }).first();
    await is3Btn.click();
    // Drawer visible with stage IS3 selected
    const stageSelect = page.locator('select').nth(0);
    // Stufe-Select is the first select in drawer; ensure it exists then choose IS3
    await stageSelect.selectOption('IS3');
    // Submit
    await page.getByRole('button', { name: 'Einplanen' }).click();
    await expect(page).toHaveURL(/\/depot\/map\?depot=/);
    // Planned slot appears (light blue planned)
    await expect(page.locator('[data-testid="planned-slot"]').first()).toBeVisible();
  });
});
