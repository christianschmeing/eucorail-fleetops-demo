import { upstreamJson } from '../../_lib/upstream';
export async function GET() {
  return upstreamJson('/api/ecm/wos', { items: [] });
}
export async function POST() {
  return upstreamJson('/api/ecm/wos', { ok: true });
}
export async function PATCH() {
  return upstreamJson('/api/ecm/wos', { ok: true });
}
