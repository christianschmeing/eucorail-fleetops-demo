import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 60_000,
	expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
	fullyParallel: true,
	reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
	use: {
		baseURL: 'http://localhost:3001',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }
	]
});


