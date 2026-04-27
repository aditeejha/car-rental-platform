'use client';
import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { api } from '../lib/api';
import useOnline from '../hooks/useOnline';

const STARTERS = [
  { label: 'How do offline bookings sync?', type: 'offline_guidance', context: { pendingActions: 0 } },
  { label: 'Help me capture pre-trip images', type: 'damage_guidance', context: { phase: 'pre', capturedAngles: [] } },
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: 'Hi! I\'m your trust assistant. I can guide damage captures, explain disputes, and reassure you when offline.' },
  ]);
  const [busy, setBusy] = useState(false);
  const online = useOnline();

  async function ask(starter) {
    setBusy(true);
    setMsgs((m) => [...m, { role: 'user', text: starter.label }]);
    try {
      if (!online) {
        setMsgs((m) => [...m, { role: 'ai', text: 'You are offline. Your queued actions will sync automatically — nothing is lost.' }]);
      } else {
        const r = await api('/ai/assist', { method: 'POST', body: { type: starter.type, context: starter.context } });
        setMsgs((m) => [...m, { role: 'ai', text: r.message, next: r.next_step }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', text: 'I could not reach the assistant. The app still works — try again later.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((s) => !s)}
        className="fixed bottom-6 right-6 btn-primary shadow-soft z-40"
        aria-label="Open AI Assistant"
      >
        {open ? <X size={18}/> : <MessageCircle size={18}/>}
        <span className="ml-2 hidden sm:inline">Trust assistant</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-[360px] max-w-[92vw] card z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-600 font-semibold flex items-center justify-between text-slate-100">
            Trust Assistant
            <span className="text-xs text-slate-500">explains, never decides</span>
          </div>
          <div className="p-3 max-h-80 overflow-y-auto scroll-thin space-y-2 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={`px-3 py-2 rounded-xl ${m.role === 'user' ? 'bg-brand-500/15 text-brand-100 ml-8 border border-brand-500/30' : 'bg-ink-700/60 text-slate-200 mr-8 border border-ink-600'}`}>
                {m.text}
                {m.next && <div className="text-[11px] text-slate-500 mt-1">next: {m.next}</div>}
              </div>
            ))}
            {busy && <div className="text-xs text-slate-500">thinking…</div>}
          </div>
          <div className="p-3 border-t border-ink-600 grid grid-cols-1 gap-2">
            {STARTERS.map((s) => (
              <button key={s.label} onClick={() => ask(s)} className="btn-ghost text-sm justify-start">
                <Send size={14} className="mr-2"/> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
