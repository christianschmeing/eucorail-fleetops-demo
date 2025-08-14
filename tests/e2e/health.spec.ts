import { test, expect } from '@playwright/test';

test('API health endpoint is ok', async ({ request }) => {
	const res = await request.get('http://localhost:4100/health');
	expect(res.ok()).toBeTruthy();
	const json = await res.json();
	expect(json.status).toBe('ok');
});


