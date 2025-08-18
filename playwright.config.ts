import { defineConfig, devices } from '@playwright/test';

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: false,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // If a webServer would normally be used, skip when orchestrated externally
  webServer: skipWebServer ? undefined : undefined,
});
