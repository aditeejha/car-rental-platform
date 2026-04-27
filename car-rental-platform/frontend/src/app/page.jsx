'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Wifi, Sparkles, Camera, ArrowRight, Search } from 'lucide-react';
import { api } from '../lib/api';
import CarCard from '../components/CarCard';

export default function Home() {
  const [city, setCity]   = useState('');
  const [cars, setCars]   = useState([]);
  const [recs, setRecs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (city) q.set('city', city);
    api(`/cars?${q}`).then((r) => setCars(r.items || [])).finally(() => setLoading(false));
  }, [city]);

  useEffect(() => {
    api('/cars/recommend', { method: 'POST', body: { tripType: 'city', passengers: 4 } })
      .then((r) => setRecs(r.items || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=80"
            alt="Hero" fill priority className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/70 to-transparent" />
        </div>
        <div className="relative px-6 sm:px-12 py-20 sm:py-28 text-white max-w-3xl">
          <span className="inline-flex items-center gap-2 chip bg-white/10 text-white border border-white/20">
            <Sparkles size={14}/> Trust-first car rental
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
            Drive anywhere.<br/>
            <span className="text-brand-200">Trust everywhere.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-200 max-w-xl">
            Verifiable damage evidence, sync-based offline booking, and a safety
            toolkit built for solo travellers.
          </p>

          <div className="mt-7 bg-white rounded-2xl p-2 flex items-center gap-2 max-w-xl shadow-soft">
            <div className="flex items-center pl-3 text-slate-400"><Search size={18}/></div>
            <input
              className="flex-1 px-2 py-3 outline-none text-slate-900 placeholder-slate-400 bg-transparent"
              placeholder="Where to? Bengaluru, Mumbai, Delhi…"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Link href={`/cars${city ? `?city=${encodeURIComponent(city)}` : ''}`}
                  className="btn-primary">Search<ArrowRight size={16} className="ml-1"/></Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: ShieldCheck, title: 'Damage accountability', body: 'Pre & post images with metadata, scored against rules.' },
          { icon: Wifi,        title: 'Offline-first',         body: 'Bookings & uploads queued in IndexedDB, synced on reconnect.' },
          { icon: Camera,      title: 'Safety-first UX',       body: 'KYC, emergency button, route sharing, live tracking.' },
          { icon: Sparkles,    title: 'AI trust assistant',    body: 'Explains disputes, never decides them.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6 hover:border-ink-500 transition">
            <div className="h-10 w-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{body}</p>
          </div>
        ))}
      </section>

      {/* Available now */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">Available now</h2>
          <Link href="/cars" className="text-sm text-brand-300 hover:text-brand-200">See all →</Link>
        </div>
        {loading ? (
          <SkeletonGrid />
        ) : cars.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">No cars match — try a different city.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cars.slice(0, 6).map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        )}
      </section>

      {/* Recommended */}
      {recs.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Recommended for a city trip</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {recs.slice(0, 4).map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        </section>
      )}

      <section className="card p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute -inset-px bg-gradient-to-br from-brand-600/30 via-brand-700/15 to-transparent pointer-events-none rounded-2xl"/>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-50">Travel with peace of mind</h3>
            <p className="text-slate-300 mt-2 max-w-xl">
              Every trip captures pre/post evidence. Our rule engine flags inconsistencies
              before they become disputes. Our AI assistant explains the findings.
            </p>
          </div>
          <Link href="/cars" className="btn-light justify-self-start md:justify-self-end">
            Find a car <ArrowRight size={16} className="ml-1"/>
          </Link>
        </div>
      </section>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="h-44 bg-slate-100 animate-pulse"/>
          <div className="p-4 space-y-2">
            <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse"/>
            <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse"/>
          </div>
        </div>
      ))}
    </div>
  );
}
