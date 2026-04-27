'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { api } from '../../lib/api';
import CarCard from '../../components/CarCard';
import useAuth from '../../hooks/useAuth';

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    api('/favorites').then((r) => setItems(r.items || []));
  }, [user]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!user) return <p className="text-slate-300">Please <Link href="/login" className="text-brand-300 underline">sign in</Link>.</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <Heart className="text-rose-500 fill-rose-500"/> Saved cars
      </h1>
      {items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          No favorites yet. Tap the heart on any car to save it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c) => <CarCard key={c.id} car={c}/>)}
        </div>
      )}
    </div>
  );
}
