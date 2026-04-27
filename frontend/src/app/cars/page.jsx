'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import CarCard from '../../components/CarCard';
import Filters from '../../components/Filters';

// Read URL params on first mount so deep links + the home-page hero search
// (?city=Bengaluru) actually filter the listing.
function CarsBrowser() {
  const router  = useRouter();
  const params  = useSearchParams();
  const [filters, setFilters] = useState(() => {
    const f = {};
    for (const k of ['city', 'category', 'minSeats', 'maxPrice']) {
      const v = params.get(k);
      if (v) f[k] = v;
    }
    return f;
  });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    api(`/cars?${qs}`).then(setData).finally(() => setLoading(false));

    // mirror state into the URL so back-button + reload preserve filters
    const url = qs.toString() ? `/cars?${qs}` : '/cars';
    router.replace(url, { scroll: false });
  }, [filters, router]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Browse cars</h1>
      <Filters value={filters} onChange={setFilters} />
      <p className="text-sm text-slate-400">
        {loading ? 'Searching…' : `${data.total} car(s) match your filters`}
      </p>
      {!loading && data.items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">No cars match — try clearing filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.items.map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      )}
    </div>
  );
}

export default function CarsPage() {
  // useSearchParams has to be wrapped in Suspense in App Router
  return (
    <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
      <CarsBrowser/>
    </Suspense>
  );
}
