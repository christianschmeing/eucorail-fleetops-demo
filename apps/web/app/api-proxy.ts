export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

export async function fetchAPI(path: string) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}
