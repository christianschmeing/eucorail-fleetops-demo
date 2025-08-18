import { upstreamJson } from '../_lib/upstream';
export async function GET() {
  return upstreamJson('/api/lines', { items: [], fallback: true });
}
