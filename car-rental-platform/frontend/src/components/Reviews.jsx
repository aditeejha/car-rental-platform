'use client';
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../lib/api';
import useAuth from '../hooks/useAuth';

export default function Reviews({ carId }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [avg, setAvg] = useState(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`/reviews/${carId}`).then((r) => { setItems(r.items || []); setAvg(r.average); });
  useEffect(() => { load(); }, [carId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Sign in to leave a review' } }));
      return;
    }
    setBusy(true);
    try {
      await api('/reviews', { method: 'POST', body: { carId, rating, body } });
      setBody(''); setRating(5);
      load();
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Review posted' } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: e.message } }));
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Reviews</h3>
        {avg !== null && (
          <span className="chip"><Star size={12} className="text-amber-400 fill-amber-400"/>{avg.toFixed(1)} · {items.length}</span>
        )}
      </div>

      <form onSubmit={submit} className="mb-5">
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} type="button"
              onClick={() => setRating(n)}
              className="p-0.5"
              aria-label={`Rate ${n} stars`}
            >
              <Star size={20} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}/>
            </button>
          ))}
        </div>
        <textarea
          rows={3} className="input mb-2"
          placeholder={user ? 'Share your experience…' : 'Sign in to leave a review'}
          value={body} onChange={(e) => setBody(e.target.value)}
        />
        <button disabled={busy} className="btn-primary text-sm">Post review</button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews yet — be the first.</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 5).map((r) => (
            <li key={r.id} className="border-t border-ink-600 pt-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{r.userName}</span>
                <span className="flex items-center text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} className="fill-amber-400"/>)}
                </span>
                <span className="ml-auto text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.body && <p className="text-sm text-slate-300 mt-1">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
