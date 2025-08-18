import { upstreamJson } from '../_lib/upstream';
export async function GET(req: Request) {
  const u = new URL(req.url);
  return upstreamJson(`/api/trains${u.search}`, { items: [], fallback: true });
}
