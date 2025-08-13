import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{ runId: string; line: string }>;

const clients = new Set<import('node:http').ServerResponse>();

const server = createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  res.writeHead(200);
  res.end('OK');
});

server.listen(5001, () => console.log('Sim SSE on :5001'));

setInterval(() => {
  const now = Date.now();
  for (const c of clients) {
    for (const t of fleet) {
      const lon = 9 + Math.random() * 2;
      const lat = 48.5 + Math.random() * 1.2;
      const payload = { type: 'location', runId: t.runId, line: t.line, ts: now, lon, lat, speed: 80 + Math.random() * 40 };
      c.write(`event: location\n`);
      c.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }
}, 1000);

