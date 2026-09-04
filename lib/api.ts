const BACKEND_URL = 'http://192.168.1.244:8080';

async function post(path: string, body: any) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  scan: (image: string, mimeType: string) => post('/api/scan', { image, mimeType }),
  stackCheck: (drugs: string[]) => post('/api/stack-check', { drugs }),
};
