'use client';
import { useEffect, useState } from 'react';
import { Car, Users, Receipt, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [m, setM] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    api('/admin/metrics').then(setM).catch((e) => setErr(e.message));
  }, [user]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!user || user.role !== 'admin') return <p className="text-slate-300">Admin only.</p>;
  if (err) return <p className="text-rose-400">{err}</p>;
  if (!m) return <p className="text-slate-400">Loading metrics…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Admin dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Car}     label="Cars (avail / total)" value={`${m.fleet.available} / ${m.fleet.total}`} />
        <Stat icon={Users}   label="Users"                value={m.users.total} />
        <Stat icon={Receipt} label="Bookings"             value={m.bookings.total} />
        <Stat icon={AlertTriangle} label="Open disputes"  value={m.disputes.open} accent={m.disputes.open > 0} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 text-slate-100">Top cars by revenue</h2>
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-left">
            <tr><th className="py-2">Car</th><th>Bookings</th><th>Booked days</th><th className="text-right">Revenue</th></tr>
          </thead>
          <tbody>
            {m.utilization.map((u) => (
              <tr key={u.id} className="border-t border-ink-600 text-slate-200">
                <td className="py-2">{u.make} {u.model}</td>
                <td>{u.bookings}</td>
                <td>{u.booked_days}</td>
                <td className="text-right font-semibold">₹{(Number(u.revenue_cents) / 100).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
