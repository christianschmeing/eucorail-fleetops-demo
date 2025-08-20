import allocation from '@/data/fleet-allocation.json';

export async function GET() {
  return new Response(JSON.stringify(allocation), {
    headers: { 'content-type': 'application/json' },
  });
}
