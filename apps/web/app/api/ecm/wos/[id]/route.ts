import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const base = process.env.API_BASE || '';
  const body = await request.json();
  if (!base)
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  const r = await fetch(`${base}/api/ecm/wos/${encodeURIComponent(params.id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return NextResponse.json(data, {
    status: r.status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
