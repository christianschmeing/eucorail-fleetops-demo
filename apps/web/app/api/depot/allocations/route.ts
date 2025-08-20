import { trackGeometries } from '@/app/(routes)/depot/track-geometries';

type Allocation = {
  id: string;
  train_id: string;
  line_code?: string;
  trackId: string;
  startPlanned: string;
  endPlanned: string;
  etaRelease?: string;
  purpose: string;
  risk?: 'low' | 'med' | 'high';
  status: 'active' | 'maintenance' | 'reserve' | 'abstellung' | 'alarm' | 'offline';
  is_reserve?: boolean;
  lengthM?: number;
  offsetM?: number;
  home_depot?: 'Essingen' | 'Langweid';
};

const PLANNED: Allocation[] = [];

export async function GET() {
  return new Response(JSON.stringify({ planned: PLANNED }), {
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Allocation> & {
      depot: 'Essingen' | 'Langweid';
    };
    if (!body.train_id || !body.trackId) {
      return new Response(JSON.stringify({ error: 'train_id and trackId required' }), {
        status: 400,
      });
    }
    const track = trackGeometries.find((t) => t.id === String(body.trackId));
    const lengthM = track?.lengthM ?? 180;
    const now = Date.now();
    const start = new Date(now + 10 * 60 * 1000); // in 10 min
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h slot
    const alloc: Allocation = {
      id: `planned-${Date.now()}`,
      train_id: String(body.train_id),
      line_code: body.line_code || 'DEPOT',
      trackId: String(body.trackId),
      startPlanned: (body.startPlanned as string) || start.toISOString(),
      endPlanned: (body.endPlanned as string) || end.toISOString(),
      etaRelease: end.toISOString(),
      purpose: body.purpose || 'IS2',
      risk: 'low',
      status: 'active',
      is_reserve: false,
      lengthM,
      offsetM: Math.min(lengthM - 20, Math.max(10, Math.floor(Math.random() * (lengthM - 40)))),
      home_depot: body.depot || (track?.depot as any),
    };
    PLANNED.push(alloc);
    return new Response(JSON.stringify({ ok: true, allocation: alloc }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'invalid payload' }), {
      status: 400,
    });
  }
}
