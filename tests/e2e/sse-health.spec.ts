import { test, expect } from '@playwright/test';

test.describe('SSE endpoints health', () => {
  test('positions stream exposes text/event-stream', async ({ request }) => {
    test.skip(true, 'Skip streaming header check in CI/TEST_MODE');
    const res = await request.get('/api/positions/stream', {
      headers: { Accept: 'text/event-stream' },
      timeout: 5000,
    });
    expect(res.ok()).toBeTruthy();
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('text/event-stream');
  });

  test('tcms stream exposes text/event-stream', async ({ request }) => {
    test.skip(true, 'Skip streaming header check in CI/TEST_MODE');
    const res = await request.get('/api/tcms/stream', {
      headers: { Accept: 'text/event-stream' },
      timeout: 5000,
    });
    expect(res.ok()).toBeTruthy();
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('text/event-stream');
  });

  test('tcms events list returns JSON with events', async ({ request }) => {
    const res = await request.get('/api/tcms/events', { timeout: 10_000 });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.events)).toBeTruthy();
  });
});
