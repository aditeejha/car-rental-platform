// Offline-first queue backed by IndexedDB.
// Anything the user does while offline is appended here as a typed
// "action" with a stable clientRef. When the browser reports
// `navigator.onLine`, drainQueue() POSTs the actions to /api/sync.

import { openDB } from 'idb';
import { api } from './api';

const DB_NAME = 'trustly-offline';
const STORE   = 'queue';

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'clientRef' });
      }
    },
  });
}

const uuid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `cli_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export async function enqueue(action) {
  const d = await db();
  const record = { clientRef: action.clientRef || uuid(), createdAt: Date.now(), ...action };
  await d.put(STORE, record);
  return record;
}

export async function pending() {
  const d = await db();
  return d.getAll(STORE);
}

export async function clearOne(clientRef) {
  const d = await db();
  await d.delete(STORE, clientRef);
}

export async function drainQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return { drained: 0 };
  const items = await pending();
  if (items.length === 0) return { drained: 0 };

  const res = await api('/sync', {
    method: 'POST',
    body: { actions: items.map((i) => ({ clientRef: i.clientRef, type: i.type, payload: i.payload })) },
  });

  for (const r of res.results || []) {
    if (r.status === 'accepted' || r.status === 'rejected') {
      // Rejected items are removed too — they will not succeed on retry.
      await clearOne(r.clientRef);
    }
  }
  return { drained: res.processed, results: res.results };
}

export function installSyncListeners(onUpdate) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    try { const r = await drainQueue(); onUpdate?.(r); } catch (e) { console.warn('drain failed', e); }
  };
  window.addEventListener('online', handler);
  // also try once at boot
  setTimeout(handler, 800);
  return () => window.removeEventListener('online', handler);
}
