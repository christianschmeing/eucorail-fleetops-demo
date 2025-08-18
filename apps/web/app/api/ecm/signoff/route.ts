import { upstreamJson } from '../../_lib/upstream';
export async function GET() {
  return upstreamJson('/api/ecm/signoffs', { items: [] });
}
export async function POST() {
  return upstreamJson('/api/ecm/signoff', { ok: true });
}
