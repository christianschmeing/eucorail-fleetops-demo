import { NextResponse } from 'next/server';

export async function GET() {
  const base = '';
  const out: any = { timestamp: new Date().toISOString(), app_url: '', tests: {} };
  try {
    const r = await fetch(`${base}/api/health`, { cache: 'no-store' });
    out.tests.health = { status: r.status, ok: r.ok };
  } catch (e: any) {
    out.tests.health = { error: String(e?.message || e) };
  }
  try {
    const r = await fetch(`${base}/api/trains?limit=10`, { cache: 'no-store' });
    const j = await r.json();
    const list = Array.isArray(j) ? j : Array.isArray(j?.trains) ? j.trains : [];
    out.tests.trains = {
      status: r.status,
      count: list.length,
      ok: Array.isArray(list) && list.length >= 10,
    };
  } catch (e: any) {
    out.tests.trains = { error: String(e?.message || e) };
  }
  try {
    const r = await fetch(`${base}/api/lines`, { cache: 'no-store' });
    const j = await r.json();
    out.tests.lines = { status: r.status, count: Array.isArray(j) ? j.length : 0, ok: r.ok };
  } catch (e: any) {
    out.tests.lines = { error: String(e?.message || e) };
  }
  try {
    const r = await fetch(`${base}/api/depots`, { cache: 'no-store' });
    const j = await r.json();
    out.tests.depots = { status: r.status, count: Array.isArray(j) ? j.length : 0, ok: r.ok };
  } catch (e: any) {
    out.tests.depots = { error: String(e?.message || e) };
  }
  try {
    const r = await fetch(`${base}/api/metrics/kpi`, { cache: 'no-store' });
    const j = await r.json();
    out.tests.kpi = { status: r.status, ok: r.ok && typeof j?.availabilityPct === 'number' };
  } catch (e: any) {
    out.tests.kpi = { error: String(e?.message || e) };
  }
  out.summary = { ready_for_testing: Boolean(out?.tests?.trains?.ok) };
  return NextResponse.json(out);
}
