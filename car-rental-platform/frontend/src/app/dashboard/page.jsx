'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet, Receipt, ListChecks, Plus, XCircle, ChevronRight, Gift, Copy, Clock, CalendarPlus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { pending } from '../../lib/offlineQueue';
import useAuth from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import CarCard from '../../components/CarCard';

function toast(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('toast', { detail: { message } }));
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [queue,    setQueue]    = useState([]);
  const [balance,  setBalance]  = useState(null);
  const [referral, setReferral] = useState(null);
  const [recent,   setRecent]   = useState([]);

  const [topupOpen, setTopupOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [extendTarget, setExtendTarget] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [extendHours, setExtendHours] = useState(24);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [b, w, q, r, rv] = await Promise.all([
      api('/bookings/mine').catch(() => ({ items: [] })),
      api('/wallet/balance').catch(() => ({ walletCents: 0 })),
      pending().catch(() => []),
      api('/referral').catch(() => null),
      api('/cars-recent').catch(() => ({ items: [] })),
    ]);
    setBookings(b.items || []);
    setBalance((w.walletCents || 0) / 100);
    setQueue(q);
    setReferral(r);
    setRecent(rv.items || []);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!user)   return <p>Please <Link href="/login" className="text-brand-300 underline">sign in</Link>.</p>;

  const doTopup = async () => {
    setBusy(true);
    try {
      await api('/wallet/topup', { method: 'POST', body: { amount: Number(amount) } });
      toast(`Wallet topped up by ₹${Number(amount).toLocaleString()}`);
      setTopupOpen(false);
      refresh();
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  const doCancel = async () => {
    setBusy(true);
    try {
      await api(`/bookings/${cancelTarget.id}/cancel`, { method: 'POST' });
      toast('Booking cancelled.');
      setCancelTarget(null); refresh();
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  const doExtend = async () => {
    setBusy(true);
    try {
      await api(`/bookings/${extendTarget.id}/extend`, { method: 'POST', body: { hours: Number(extendHours) } });
      toast(`Trip extended by ${Math.round(Number(extendHours) / 24)} day(s).`);
      setExtendTarget(null); refresh();
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  const copyReferral = async () => {
    if (!referral?.code) return;
    try { await navigator.clipboard.writeText(referral.code); toast('Referral code copied.'); }
    catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.fullName.split(' ')[0]}.</h1>
          <p className="text-sm text-slate-400">Trust score {user.trustScore} · {user.kycVerified ? 'KYC verified' : 'KYC pending'}</p>
        </div>
        <Link href="/cars" className="btn-primary text-sm">
          Browse cars <ChevronRight size={16} className="ml-1"/>
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Receipt}    label="Trips"        value={bookings.length} />
        <div className="card p-5 flex items-start justify-between">
          <div>
            <Wallet className="text-brand-400"/>
            <p className="mt-2 text-xs text-slate-400">Wallet</p>
            <p className="text-xl font-semibold text-slate-50">{balance !== null ? `₹${balance.toLocaleString()}` : '—'}</p>
          </div>
          <button onClick={() => setTopupOpen(true)} className="btn-ghost text-xs"><Plus size={14} className="mr-1"/> Top up</button>
        </div>
        <Stat icon={ListChecks} label="Queued offline actions" value={queue.length} accent={queue.length > 0} />
      </div>

      {referral && (
        <div className="card p-5 flex items-center gap-4 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
            <Gift size={20}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Refer a friend</p>
            <p className="text-xs text-slate-400">{referral.reward} · {referral.uses} successful referral(s)</p>
          </div>
          <code className="px-3 py-2 rounded-lg bg-ink-700 text-brand-200 font-mono text-sm">{referral.code}</code>
          <button onClick={copyReferral} className="btn-ghost text-sm"><Copy size={14} className="mr-1"/>Copy</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-600 flex items-center justify-between">
          <h2 className="font-semibold">Your trips</h2>
          <span className="text-xs text-slate-500">{bookings.length} total</span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm mb-3">No trips yet — let's find you a ride.</p>
            <Link href="/cars" className="btn-primary text-sm">Browse cars</Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink-600">
            {bookings.map((b) => (
              <li key={b.id} className="px-5 py-4 flex items-center gap-4">
                <div className="relative h-14 w-20 rounded-lg overflow-hidden bg-ink-700 shrink-0">
                  <Image src={b.car.image} alt="" fill sizes="80px" className="object-cover"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-slate-100">{b.car.make} {b.car.model}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(b.startAt).toLocaleDateString()} → {new Date(b.endAt).toLocaleDateString()}
                  </p>
                  <span className={`mt-1 inline-block chip text-[11px] capitalize ${
                    b.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                    b.status === 'cancelled' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'         :
                    b.status === 'disputed'  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'      : ''
                  }`}>{b.status}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-100">₹{b.total.toLocaleString()}</p>
                  <div className="flex items-center gap-3 mt-1 justify-end">
                    {b.status === 'confirmed' && (
                      <>
                        <button onClick={() => setExtendTarget(b)} className="text-xs text-brand-300 hover:underline inline-flex items-center gap-1">
                          <CalendarPlus size={12}/> Extend
                        </button>
                        <button onClick={() => setCancelTarget(b)} className="text-xs text-rose-400 hover:underline">Cancel</button>
                      </>
                    )}
                    <Link href={`/trip/${b.id}`} className="text-xs text-brand-300 hover:underline">Open trip</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recent.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock size={16} className="text-slate-400"/> Recently viewed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent.slice(0, 4).map((c) => <CarCard key={c.id} car={c}/>)}
          </div>
        </section>
      )}

      {queue.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Queued offline actions</h2>
          <ul className="text-sm space-y-1 text-slate-300">
            {queue.map((q) => (
              <li key={q.clientRef}>
                <span className="chip mr-2">{q.type}</span>
                <code className="text-xs text-slate-400">{q.clientRef}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={topupOpen} onClose={() => setTopupOpen(false)} title="Top up your wallet"
        footer={<>
          <button onClick={() => setTopupOpen(false)} className="btn-ghost">Cancel</button>
          <button onClick={doTopup} disabled={busy} className="btn-primary">Top up ₹{Number(amount).toLocaleString()}</button>
        </>}
      >
        <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
        <input
          type="number" min={100} max={1_000_000} step={100}
          className="input mb-3"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {[500, 1000, 2500, 5000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`chip cursor-pointer ${Number(amount) === v ? 'bg-brand-600 text-white border-brand-500' : ''}`}>
              ₹{v.toLocaleString()}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Demo mode — no real payment is processed.</p>
      </Modal>

      <Modal
        open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel this booking?"
        footer={<>
          <button onClick={() => setCancelTarget(null)} className="btn-ghost">Keep booking</button>
          <button onClick={doCancel} disabled={busy} className="btn bg-rose-600 text-white hover:bg-rose-700">
            <XCircle size={16} className="mr-2"/> Yes, cancel
          </button>
        </>}
      >
        {cancelTarget && (
          <p className="text-sm text-slate-300">
            Cancelling <strong className="text-slate-100">{cancelTarget.car.make} {cancelTarget.car.model}</strong> from{' '}
            {new Date(cancelTarget.startAt).toLocaleDateString()} to{' '}
            {new Date(cancelTarget.endAt).toLocaleDateString()}.
          </p>
        )}
      </Modal>

      <Modal
        open={!!extendTarget} onClose={() => setExtendTarget(null)} title="Extend trip"
        footer={<>
          <button onClick={() => setExtendTarget(null)} className="btn-ghost">Cancel</button>
          <button onClick={doExtend} disabled={busy} className="btn-primary">Extend</button>
        </>}
      >
        {extendTarget && (
          <>
            <p className="text-sm text-slate-300 mb-3">
              Extending <strong className="text-slate-100">{extendTarget.car.make} {extendTarget.car.model}</strong>.
            </p>
            <label className="text-xs text-slate-400">Add</label>
            <select className="input" value={extendHours} onChange={(e) => setExtendHours(Number(e.target.value))}>
              <option value={24}>1 day</option>
              <option value={48}>2 days</option>
              <option value={72}>3 days</option>
              <option value={168}>1 week</option>
            </select>
          </>
        )}
      </Modal>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className={`card p-5 ${accent ? 'ring-2 ring-amber-500/40' : ''}`}>
      <Icon className="text-brand-400" />
      <p className="mt-2 text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}
