'use client';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../lib/api';

const KEY = 'trustly:fav:cache';

function readCache() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeCache(cache) {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
}

// Refresh the favorites cache once per page load — not per card. Multiple
// FavoriteButton instances on the same page deduplicate via this promise.
let inflight = null;
async function syncCache() {
  if (typeof window === 'undefined') return {};
  if (!inflight) {
    inflight = api('/favorites')
      .then((r) => {
        const next = {};
        for (const c of r.items || []) next[c.id] = true;
        writeCache(next);
        // notify all heart buttons to re-read
        window.dispatchEvent(new CustomEvent('fav-cache-updated'));
        return next;
      })
      .catch(() => readCache())
      .finally(() => { setTimeout(() => { inflight = null; }, 1000); });
  }
  return inflight;
}

export default function FavoriteButton({ carId, className = '' }) {
  const [fav, setFav] = useState(() => !!readCache()[carId]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    syncCache().then((c) => setFav(!!c[carId]));
    const onUpdate = () => setFav(!!readCache()[carId]);
    window.addEventListener('fav-cache-updated', onUpdate);
    return () => window.removeEventListener('fav-cache-updated', onUpdate);
  }, [carId]);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    // Optimistic flip — feels instant.
    const next = !fav;
    setFav(next);
    const cache = readCache();
    cache[carId] = next; writeCache(cache);
    window.dispatchEvent(new CustomEvent('fav-cache-updated'));

    try {
      const r = await api(`/favorites/${carId}/toggle`, { method: 'POST' });
      // Server is the source of truth.
      setFav(r.favorited);
      const c2 = readCache(); c2[carId] = r.favorited; writeCache(c2);
      window.dispatchEvent(new CustomEvent('fav-cache-updated'));
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: r.favorited ? 'Saved to favorites' : 'Removed from favorites' },
      }));
    } catch (err) {
      // Roll back the optimistic flip.
      setFav(fav);
      const c2 = readCache(); c2[carId] = fav; writeCache(c2);
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: err.status === 401 ? 'Sign in to save favorites' : err.message },
      }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={busy}
      aria-pressed={fav}
      aria-label={fav ? 'Remove from favorites' : 'Save to favorites'}
      title={fav ? 'Remove from favorites' : 'Save to favorites'}
      className={`h-9 w-9 rounded-full flex items-center justify-center bg-ink-950/70 hover:bg-ink-950 text-slate-100 backdrop-blur shadow-md transition active:scale-95 ${className}`}
    >
      <Heart
        size={16}
        className={fav ? 'fill-rose-500 text-rose-500' : ''}
        strokeWidth={fav ? 0 : 2}
      />
    </button>
  );
}
