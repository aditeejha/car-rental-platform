'use client';
import { useEffect } from 'react';
import { installSyncListeners } from '../lib/offlineQueue';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data === 'sync-now') window.dispatchEvent(new Event('online'));
      });
    }

    const stop = installSyncListeners((r) => {
      if (r?.drained) {
        // tiny toast via custom event, listened to by Toaster
        window.dispatchEvent(new CustomEvent('toast', {
          detail: { message: `Synced ${r.drained} queued action(s).` },
        }));
      }
    });
    return stop;
  }, []);
  return null;
}
