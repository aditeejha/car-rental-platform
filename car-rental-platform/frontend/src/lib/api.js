// Thin wrapper around fetch. Routes go through Next.js rewrites
// (frontend `/api/*` -> backend `/api/*`) so the same code works
// in dev, prod, and behind a reverse proxy.

const BASE = '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('trustly:token');
}

export function setToken(t) {
  if (typeof window === 'undefined') return;
  if (t) window.localStorage.setItem('trustly:token', t);
  else   window.localStorage.removeItem('trustly:token');
}

export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'Request failed'), {
    status: res.status, code: data?.error?.code, details: data?.error?.details,
  });
  return data;
}

export const apiUrl = (path) => `${BASE}${path}`;
