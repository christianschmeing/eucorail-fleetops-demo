export const runtime = 'edge';

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomUpdate() {
  const count = Math.floor(rand(5, 12));
  const items = [] as any[];
  const lines = ['RE9', 'RE8', 'MEX16'] as const;
  for (let i = 0; i < count; i++) {
    const region = Math.random() < 0.5 ? 'BW' : 'BY';
    const lng = region === 'BY' ? rand(10.0, 12.6) : rand(7.5, 10.5);
    const lat = region === 'BY' ? rand(47.9, 49.7) : rand(47.5, 49.2);
    const line = lines[Math.floor(Math.random() * lines.length)];
    const idNum = 10000 + Math.floor(rand(0, 20));
    const id = `${line}-${idNum}`;
    const status: 'active' | 'maintenance' | 'alert' =
      Math.random() < 0.08 ? 'maintenance' : Math.random() < 0.12 ? 'alert' : 'active';
    const delay =
      status === 'alert'
        ? Math.floor(rand(1, 10))
        : Math.random() < 0.2
          ? Math.floor(rand(1, 6))
          : 0;
    items.push({
      id,
      line,
      region,
      position: [Number(lng.toFixed(5)), Number(lat.toFixed(5))],
      speed: Math.round(rand(70, 160)),
      status,
      delay,
      updatedAt: new Date().toISOString(),
    });
  }
  return { ts: Date.now(), items };
}

export async function GET() {
  const encoder = new TextEncoder();
  const isTest = process.env.TEST_MODE === '1' || process.env.NEXT_PUBLIC_TEST_MODE === '1';
  let timer: any = null;
  let killer: any = null;
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (data: any) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };
      push({ type: 'hello', ts: Date.now() });
      timer = setInterval(
        () => push({ type: 'positions', ...randomUpdate() }),
        Math.round(rand(1000, 2000))
      );
      killer = setTimeout(
        () => {
          clearInterval(timer);
          open = false;
          try {
            controller.close();
          } catch {}
        },
        isTest ? 500 : 60000
      );
    },
    cancel() {
      if (timer) clearInterval(timer);
      if (killer) clearTimeout(killer);
      open = false;
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
