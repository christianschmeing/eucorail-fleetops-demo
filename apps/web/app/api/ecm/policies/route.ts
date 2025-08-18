import { upstreamJson } from '../../_lib/upstream';
export async function GET() {
  return upstreamJson('/api/ecm/policies', { items: [] });
}
export async function POST() {
  return upstreamJson('/api/ecm/policies', { ok: true });
}
