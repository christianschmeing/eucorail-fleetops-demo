export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const encoder = new TextEncoder();
  let iv: any = null;
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: any) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {}
      };
      send({ type: 'hello', ts: new Date().toISOString() });
      iv = setInterval(() => send({ type: 'tick', ts: new Date().toISOString() }), 15000);
      (globalThis as any).__TCMS_PUSH__ = (ev: any) => send({ type: 'tcms', event: ev });
    },
    cancel() {
      open = false;
      if (iv) clearInterval(iv);
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
