export const API_BASE = '/api'; // client: immer same-origin
export const API_UPSTREAM =
  process.env.API_UPSTREAM || process.env.NEXT_PUBLIC_API_UPSTREAM || 'http://localhost:4100'; // nur serverseitig in Next-API
export const REQ_TIMEOUT_MS = 2000;
