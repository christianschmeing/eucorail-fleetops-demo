import { defineConfig, devices } from '@playwright/test';

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';
const baseURL = process.env.BASE_URL || 'http://localhost:3001';
const enableVisual = process.env.ENABLE_VISUAL_TESTS === '1';

export default defineConfig({
  // Cover both e2e and visual suites while keeping them isolated per project
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: false,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    // Default E2E (Chromium) — stable, used by existing workflows
    {
      name: 'chromium',
      testMatch: '**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Dedicated visual tests (opt-in only when ENABLE_VISUAL_TESTS=1)
    ...(enableVisual
      ? [
          {
            name: 'visual-chromium',
            testMatch: '**/visual/**/*.visual.spec.ts',
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1920, height: 1080 },
              deviceScaleFactor: 1,
              colorScheme: 'light',
            },
          },
        ]
      : []),
  ],
  // Web server is orchestrated externally by scripts/workflows; keep undefined
  webServer: skipWebServer ? undefined : undefined,
});
