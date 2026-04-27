'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Phone, MapPin, Share2, AlertOctagon, ShieldAlert,
  XCircle, FileWarning, ChevronLeft, Activity,
} from 'lucide-react';
import { api } from '../../../lib/api';
import ImageUpload from '../../../components/ImageUpload';
import Modal from '../../../components/Modal';

function toast(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('toast', { detail: { message } }));
}

export default function TripDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking]   = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [phase, setPhase]       = useState('pre');

  const [modal, setModal]       = useState(null); // 'emergency' | 'share' | 'tracking' | 'cancel' | 'dispute' | 'host'
  const [busy, setBusy]         = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [disputeReason, setDisputeReason] = useState('damage');
  const [disputeDetail, setDisputeDetail] = useState('');

  const refresh = useCallback(() => {
    api(`/bookings/${id}`).then(setBooking).catch(() => {});
    api(`/disputes/analyze/${id}`).then(setAnalysis).catch(() => {});
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!booking) {
    return (
      <div className="card p-10 text-center text-slate-500">
        Loading trip…
      </div>
    );
  }

  const startEmergency = async () => {
    setBusy(true);
    try {
      let location = null;
      try {
        location = await new Promise((res) =>
          navigator.geolocation
            ? navigator.geolocation.getCurrentPosition(
                (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
                () => res(null),
                { timeout: 2000 }
              )
            : res(null)
        );
      } catch { /* ignore */ }
      const r = await api('/safety/emergency', { method: 'POST', body: { bookingId: id, location } });
      toast(`Emergency alert sent to ${r.contacted?.join(', ') || 'support'}.`);
    } catch (e) {
      toast(`Could not raise alert: ${e.message}`);
    } finally {
      setBusy(false); setModal(null);
    }
  };

  const startShare = async () => {
    setBusy(true);
    try {
      const r = await api('/safety/share-trip', { method: 'POST', body: { bookingId: id } });
      setShareUrl(r.shareUrl);
      try { await navigator.clipboard.writeText(r.shareUrl); toast('Trip link copied to clipboard.'); }
      catch { toast('Trip link generated.'); }
    } catch (e) { toast(`Share failed: ${e.message}`); }
    finally { setBusy(false); }
  };

  const openTracking = async () => {
    setModal('tracking');
    try {
      const r = await api(`/safety/track/${id}`);
      setTrackingData(r);
    } catch (e) { toast(`Tracking unavailable: ${e.message}`); }
  };

  const callHost = () => {
    setModal('host');
  };

  const cancelBooking = async () => {
    setBusy(true);
    try {
      await api(`/bookings/${id}/cancel`, { method: 'POST' });
      toast('Booking cancelled.');
      router.push('/dashboard');
    } catch (e) { toast(e.message); }
    finally { setBusy(false); setModal(null); }
  };

  const fileDispute = async () => {
    setBusy(true);
    try {
      await api('/disputes', { method: 'POST', body: { bookingId: id, reason: disputeReason, detail: disputeDetail } });
      toast('Dispute filed. Trust team has been notified.');
      setDisputeDetail('');
      refresh();
    } catch (e) { toast(e.message); }
    finally { setBusy(false); setModal(null); }
  };

  const start = new Date(booking.startAt);
  const end   = new Date(booking.endAt);

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-100">
        <ChevronLeft size={16}/> Back to dashboard
      </Link>

      {/* Trip header */}
      <div className="card p-5 flex flex-col sm:flex-row gap-5">
        <div className="relative h-28 sm:h-24 w-full sm:w-40 rounded-xl overflow-hidden shrink-0 bg-ink-700">
          <Image src={booking.car.image} alt="" fill className="object-cover" sizes="160px"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold">
                {booking.car.make} {booking.car.model}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {start.toLocaleString()} → {end.toLocaleString()}
              </p>
            </div>
            <span className={`chip capitalize ${
              booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
              booking.status === 'cancelled' ? 'bg-rose-50 text-rose-700'   :
              booking.status === 'disputed'  ? 'bg-amber-50 text-amber-700' : ''
            }`}>{booking.status}</span>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
            <span>Total <span className="font-semibold text-slate-900">₹{booking.total.toLocaleString()}</span></span>
            {booking.status === 'confirmed' && (
              <button
                onClick={() => setModal('cancel')}
                className="btn-ghost text-xs ml-auto"
              ><XCircle size={14} className="mr-1"/> Cancel booking</button>
            )}
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-2 flex gap-2">
            <button
              onClick={() => setPhase('pre')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${phase === 'pre' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >Pre-trip evidence</button>
            <button
              onClick={() => setPhase('post')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${phase === 'post' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >Post-trip evidence</button>
          </div>

          <ImageUpload bookingId={id} phase={phase} onChange={refresh} />

          {analysis && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity size={16} className="text-brand-600"/>
                  Evidence completeness
                </h3>
                <button
                  onClick={() => setModal('dispute')}
                  className="btn-ghost text-xs"
                ><FileWarning size={14} className="mr-1"/> File a dispute</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Bar label="Pre-trip"  value={analysis.completeness.pre}/>
                <Bar label="Post-trip" value={analysis.completeness.post}/>
              </div>

              {analysis.issues?.length > 0 && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-900">
                    {analysis.issues.length} flagged item(s)
                  </summary>
                  <ul className="mt-2 list-disc ml-5 text-amber-700">
                    {analysis.issues.slice(0, 12).map((i, k) => (
                      <li key={k}>{humanIssue(i)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Safety panel */}
        <aside className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold flex items-center gap-2"><ShieldAlert size={16} className="text-rose-600"/> Safety toolkit</h3>
            <p className="text-xs text-slate-500 mb-4">Available throughout the trip — even when offline.</p>

            <button
              onClick={() => setModal('emergency')}
              className="w-full btn bg-rose-600 text-white hover:bg-rose-700 mb-3 shadow-soft"
            ><AlertOctagon size={16} className="mr-2"/> Emergency alert</button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={callHost}      className="btn-ghost text-sm"><Phone size={14} className="mr-2"/>Call host</button>
              <button onClick={startShare}    className="btn-ghost text-sm" disabled={busy}><Share2 size={14} className="mr-2"/>Share trip</button>
              <button onClick={openTracking}  className="btn-ghost text-sm col-span-2"><MapPin size={14} className="mr-2"/>Live tracking</button>
            </div>

            {shareUrl && (
              <div className="mt-3 text-xs bg-slate-50 rounded-lg p-2 break-all">
                <span className="text-slate-500">Trip link:</span>{' '}
                <a className="text-brand-700 hover:underline" href={shareUrl}>{shareUrl}</a>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ---- Modals ---- */}
      <Modal
        open={modal === 'emergency'} onClose={() => setModal(null)} title="Send emergency alert?"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
          <button onClick={startEmergency} disabled={busy} className="btn bg-rose-600 text-white hover:bg-rose-700">
            <AlertOctagon size={16} className="mr-2"/> Send alert
          </button>
        </>}
      >
        <p className="text-sm text-slate-600">
          We'll contact the trip host and our trust operations team with your current
          location. This is a simulated alert in demo mode — no real services are dispatched.
        </p>
      </Modal>

      <Modal
        open={modal === 'tracking'} onClose={() => setModal(null)} title="Live trip tracking" maxWidth="max-w-lg"
        footer={<button onClick={() => setModal(null)} className="btn-primary">Close</button>}
      >
        {!trackingData ? (
          <p className="text-sm text-slate-500">Acquiring signal…</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="chip bg-emerald-50 text-emerald-700">ETA {trackingData.eta}</span>
              <span className="chip">{trackingData.speedKmh} km/h</span>
            </div>
            <MockMap points={trackingData.points} />
            <p className="text-xs text-slate-400 mt-2">
              Path is mocked for the demo — wire this to a real provider (Mapbox / Google) in production.
            </p>
          </>
        )}
      </Modal>

      <Modal
        open={modal === 'host'} onClose={() => setModal(null)} title="Contact the host"
        footer={<button onClick={() => setModal(null)} className="btn-primary">Done</button>}
      >
        <p className="text-sm text-slate-600 mb-3">In-app calling is mocked here. In production this opens a masked PSTN bridge.</p>
        <a href="tel:+910000000000" className="btn-primary w-full"><Phone size={16} className="mr-2"/> +91 00000 00000</a>
      </Modal>

      <Modal
        open={modal === 'cancel'} onClose={() => setModal(null)} title="Cancel this booking?"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-ghost">Keep booking</button>
          <button onClick={cancelBooking} disabled={busy} className="btn bg-rose-600 text-white hover:bg-rose-700">Yes, cancel</button>
        </>}
      >
        <p className="text-sm text-slate-600">A small cancellation penalty may apply per the rental policy.</p>
      </Modal>

      <Modal
        open={modal === 'dispute'} onClose={() => setModal(null)} title="File a dispute"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
          <button onClick={fileDispute} disabled={busy} className="btn-primary">Submit</button>
        </>}
      >
        <label className="block text-xs text-slate-500 mb-1">Reason</label>
        <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="input mb-3">
          <option value="damage">Vehicle damage</option>
          <option value="cleanliness">Cleanliness</option>
          <option value="fuel">Fuel level mismatch</option>
          <option value="late_return">Late return</option>
          <option value="other">Other</option>
        </select>
        <label className="block text-xs text-slate-500 mb-1">What happened?</label>
        <textarea
          rows={4} className="input"
          value={disputeDetail}
          onChange={(e) => setDisputeDetail(e.target.value)}
          placeholder="Be specific — the AI assistant will summarize your evidence neutrally."
        />
      </Modal>
    </div>
  );
}

function Bar({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span><span className="font-semibold text-slate-900">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MockMap({ points = [] }) {
  // Render a small SVG showing the path. Coordinates are arbitrary so we
  // normalize to the SVG viewbox.
  if (!points.length) return null;
  const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const xy = (p) => [
    ((p.lng - minLng) / Math.max(0.0001, maxLng - minLng)) * 380 + 10,
    ((maxLat - p.lat) / Math.max(0.0001, maxLat - minLat)) * 200 + 10,
  ];
  const path = points.map(xy).map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const last = xy(points[points.length - 1]);
  return (
    <svg viewBox="0 0 400 220" className="w-full h-52 rounded-xl bg-slate-100">
      <path d={path} stroke="#1f54e6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r={6} fill="#1f54e6" />
      <circle cx={last[0]} cy={last[1]} r={12} fill="#1f54e6" opacity="0.25">
        <animate attributeName="r" from="6" to="18" dur="1.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.4" to="0" dur="1.4s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function humanIssue(i) {
  switch (i.code) {
    case 'MISSING_PRE_IMAGE':  return `Missing pre-trip ${i.angle} image`;
    case 'MISSING_POST_IMAGE': return `Missing post-trip ${i.angle} image`;
    case 'PRE_AFTER_START':    return `Pre-trip ${i.angle} captured after the trip began`;
    case 'POST_OUT_OF_WINDOW': return `Post-trip ${i.angle} outside the trip window`;
    default: return `${i.code}${i.angle ? ` (${i.angle})` : ''}`;
  }
}
