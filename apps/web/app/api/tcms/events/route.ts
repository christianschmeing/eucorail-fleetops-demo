import { NextRequest, NextResponse } from 'next/server';
import seed from '@/public/data/tcms-events-seed.json';
import type { TcmsEvent } from '@/lib/tcms/types';

const EVENTS: TcmsEvent[] = (seed as any as TcmsEvent[]).slice(0, 50);

export async function GET() {
  return NextResponse.json({ events: EVENTS.slice(-500) }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const e = (await req.json()) as TcmsEvent;
  EVENTS.push(e);
  try {
    // Push to SSE stream if available
    (globalThis as any).__TCMS_PUSH__?.(e);
  } catch {}
  return NextResponse.json({ ok: true, id: e.id }, { status: 201 });
}
