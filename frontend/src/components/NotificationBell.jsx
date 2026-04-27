'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { api } from '../lib/api';

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const refresh = async () => {
    try {
      const r = await api('/notifications');
      setItems(r.items || []);
      setUnread(r.unread || 0);
    } catch { /* not signed in */ }
  };

  useEffect(() => { if (user) refresh(); }, [user]);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const markAll = async () => {
    await api('/notifications/read-all', { method: 'POST' });
    refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative p-2 rounded-lg hover:bg-ink-700 text-slate-300"
        aria-label="Notifications"
      >
        <Bell size={18}/>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card p-0 overflow-hidden animate-fadeIn">
          <header className="flex items-center justify-between px-4 py-3 border-b border-ink-600">
            <span className="font-semibold text-sm">Notifications</span>
            <button onClick={markAll} className="text-xs text-brand-300 hover:text-brand-200 inline-flex items-center gap-1">
              <Check size={12}/> Mark all read
            </button>
          </header>
          <ul className="max-h-80 overflow-y-auto scroll-thin divide-y divide-ink-600">
            {items.length === 0 && <li className="p-6 text-sm text-slate-400 text-center">You're all caught up.</li>}
            {items.map((n) => (
              <li key={n.id} className={`p-3 ${!n.readAt ? 'bg-brand-500/5' : ''}`}>
                <p className="text-sm font-medium text-slate-100">{n.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
