'use client';
import { useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { enqueue } from '../lib/offlineQueue';
import useOnline from '../hooks/useOnline';

const ANGLES = ['front', 'rear', 'left', 'right', 'odometer'];

// Real S3 flow: presign -> PUT bytes -> attach.
// Offline / no-S3 flow: queue an attach action with the image's
// public URL or a data: URL so the user can keep working.
export default function ImageUpload({ bookingId, phase, onChange }) {
  const online = useOnline();
  const [done, setDone] = useState({});
  const [busy, setBusy] = useState(null);
  const [err, setErr]   = useState('');

  // Reset checkmarks when phase toggles so old "done" state doesn't bleed.
  // Disabled because the dev server is in-memory; real persistence would
  // re-fetch existing images for this phase via /api/images/:bookingId.

  async function uploadAngle(angle, file) {
    setBusy(angle); setErr('');
    try {
      let imageUrl;
      if (online) {
        const presign = await api('/images/presign', { method: 'POST', body: { contentType: file.type } });
        if (presign.uploadUrl) {
          await fetch(presign.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          imageUrl = presign.publicUrl;
        } else {
          imageUrl = presign.publicUrl;
        }
        await api('/images/attach', {
          method: 'POST',
          body: {
            bookingId, phase, angle, imageUrl,
            capturedAt: new Date().toISOString(),
          },
        });
      } else {
        const dataUrl = await readAsDataUrl(file);
        await enqueue({
          type: 'image.attach',
          payload: {
            bookingId, phase, angle, imageUrl: dataUrl,
            capturedAt: new Date().toISOString(),
          },
        });
      }
      setDone((d) => ({ ...d, [angle]: imageUrl || 'queued' }));
      onChange?.();
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold capitalize text-slate-100">{phase}-trip evidence</h3>
          <p className="text-xs text-slate-400">
            Capture all 5 angles. {online ? 'Uploads go straight to storage.' : 'Offline — uploads will sync later.'}
          </p>
        </div>
        <span className="chip">{Object.keys(done).length}/{ANGLES.length}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ANGLES.map((a) => {
          const isDone = !!done[a];
          return (
            <label
              key={a}
              className={`relative cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center text-center text-sm transition ${
                isDone
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-dashed border-ink-500 bg-ink-700/40 hover:bg-ink-700 text-slate-300'
              }`}
            >
              <input
                type="file" accept="image/*" capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAngle(a, e.target.files[0])}
              />
              {isDone ? <CheckCircle2 className="text-emerald-400" /> : <Camera className="text-slate-500"/>}
              <span className="mt-1 capitalize">{a}</span>
              {busy === a && <span className="text-[11px] text-slate-500">uploading…</span>}
            </label>
          );
        })}
      </div>

      {err && (
        <p className="mt-3 text-sm text-amber-400 flex items-center gap-1">
          <AlertTriangle size={14}/> {err}
        </p>
      )}
    </div>
  );
}

function readAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
