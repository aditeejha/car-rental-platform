'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Users, Briefcase, Fuel, Cog, MapPin, Star, ShieldCheck, Tag, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { enqueue } from '../../../lib/offlineQueue';
import useOnline from '../../../hooks/useOnline';
import useAuth from '../../../hooks/useAuth';
import FavoriteButton from '../../../components/FavoriteButton';
import Reviews from '../../../components/Reviews';

export default function CarDetail() {
  const { id } = useParams();
  const router = useRouter();
  const online = useOnline();
  const { user } = useAuth();

  const [car, setCar]   = useState(null);
  const [start, setStart] = useState(() => new Date(Date.now() + 86400_000).toISOString().slice(0, 16));
  const [end,   setEnd]   = useState(() => new Date(Date.now() + 86400_000 * 3).toISOString().slice(0, 16));
  const [insurance, setInsurance] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState(null); // {code, label, off} | {error}
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  useEffect(() => {
    api(`/cars/${id}`).then(setCar);
    if (user) api(`/cars/${id}/view`, { method: 'POST' }).catch(() => {});
  }, [id, user]);

  if (!car) return <p className="text-slate-400">Loading…</p>;

  const days = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400_000));
  const subtotal = days * car.price;
  const insuranceFee = insurance ? days * 199 : 0;
  const discount = promoState?.off || 0;
  const tax = Math.round((subtotal + insuranceFee - discount) * 0.05);
  const total = subtotal + insuranceFee - discount + tax;

  async function applyPromo() {
    setPromoState(null);
    if (!promoCode) return;
    try {
      const r = await api('/promos/validate', { method: 'POST', body: { code: promoCode, subtotal } });
      setPromoState(r);
    } catch (e) {
      setPromoState({ error: e.message });
    }
  }

  async function book() {
    if (!user) { router.push('/login'); return; }
    setBusy(true); setErr('');
    try {
      const clientRef = `book_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const payload = {
        carId: car.id,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        clientRef,
        insurance,
        promo: promoState?.code || undefined,
      };
      if (online) {
        const r = await api('/bookings', { method: 'POST', body: payload });
        router.push(`/trip/${r.id}`);
      } else {
        await enqueue({ type: 'booking.create', clientRef, payload });
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Offline — booking queued.' } }));
        router.push('/dashboard');
      }
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <div className="card overflow-hidden">
          <div className="relative h-72 sm:h-96 bg-ink-800">
            <Image src={car.heroImage} alt={`${car.make} ${car.model}`} fill className="object-cover" />
            <FavoriteButton carId={car.id} className="absolute top-4 right-4"/>
          </div>
          {car.gallery?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 p-2">
              {car.gallery.map((g, i) => (
                <div key={i} className="relative h-24 rounded-lg overflow-hidden bg-ink-800">
                  <Image src={g} alt={`gallery-${i}`} fill className="object-cover"/>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h1 className="text-2xl font-semibold tracking-tight">{car.make} {car.model}<span className="text-slate-500 font-normal"> {car.year}</span></h1>
          <p className="text-slate-400 text-sm flex items-center gap-1 mt-1"><MapPin size={14}/> {car.city}</p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Spec icon={Users}    label="Seats"        value={car.seats} />
            <Spec icon={Briefcase}label="Luggage"      value={car.luggage} />
            <Spec icon={Cog}      label="Transmission" value={car.transmission} />
            <Spec icon={Fuel}     label="Fuel"         value={car.fuelType} />
          </div>

          {car.features?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {car.features.map((f) => <span key={f} className="chip">{f}</span>)}
            </div>
          )}

          <p className="mt-4 text-sm text-slate-300 flex items-center gap-1">
            <Star className="text-amber-400 fill-amber-400" size={14}/>
            Safety rating {car.safetyRating.toFixed(1)} / 5
          </p>
        </div>

        <Reviews carId={car.id}/>
      </div>

      <aside className="space-y-3">
        <div className="card p-5 sticky top-24">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-400">Today's price</span>
            <span className="text-2xl font-bold text-slate-50">₹{car.price.toLocaleString()}<span className="text-sm font-normal text-slate-500">/day</span></span>
          </div>
          <p className="text-[11px] text-slate-500">Dynamic — adjusts for demand, time and scarcity.</p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-slate-400">Pick-up</label>
              <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Drop-off</label>
              <input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>

            <label className="flex items-start gap-2 p-3 rounded-xl border border-ink-600 bg-ink-700/40 cursor-pointer">
              <input
                type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <div className="text-sm">
                <span className="font-medium text-slate-100 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-400"/> Add Plus protection
                </span>
                <span className="text-xs text-slate-400">₹199 / day · damage waiver, glass & tyre</span>
              </div>
            </label>

            <div>
              <label className="text-xs text-slate-400">Promo code</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="TRUSTLY10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                />
                <button onClick={applyPromo} className="btn-ghost"><Tag size={14} className="mr-1"/>Apply</button>
              </div>
              {promoState?.code && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  Applied: {promoState.label} (–₹{promoState.off.toLocaleString()})
                  <button onClick={() => { setPromoState(null); setPromoCode(''); }} className="ml-1 text-slate-400 hover:text-slate-200">
                    <X size={12}/>
                  </button>
                </p>
              )}
              {promoState?.error && <p className="text-xs text-rose-400 mt-1">{promoState.error}</p>}
            </div>

            <div className="border-t border-ink-600 pt-3 space-y-1 text-sm">
              <Row label={`₹${car.price.toLocaleString()} × ${days} day(s)`} value={subtotal}/>
              {insurance && <Row label="Insurance" value={insuranceFee}/>}
              {discount > 0 && <Row label="Promo discount" value={-discount} neg/>}
              <Row label="GST (5%)" value={tax}/>
              <div className="flex items-center justify-between pt-2 border-t border-ink-600 mt-2">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">₹{total.toLocaleString()}</span>
              </div>
            </div>

            <button onClick={book} disabled={busy} className="btn-primary w-full">
              {busy ? 'Booking…' : online ? 'Book now' : 'Queue booking (offline)'}
            </button>
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <p className="text-[11px] text-slate-500 text-center">
              Pre & post-trip images required to release the deposit.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-slate-500" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium capitalize text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value, neg }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span>{label}</span>
      <span className={neg ? 'text-emerald-400' : ''}>
        {neg ? '–' : ''}₹{Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}
