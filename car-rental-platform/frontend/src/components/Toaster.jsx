'use client';
import { useEffect, useState } from 'react';

export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      const id = Math.random().toString(36).slice(2);
      setItems((it) => [...it, { id, message: e.detail.message }]);
      setTimeout(() => setItems((it) => it.filter((x) => x.id !== id)), 3500);
    };
    window.addEventListener('toast', onToast);
    return () => window.removeEventListener('toast', onToast);
  }, []);
  return (
    <div className="fixed bottom-6 left-6 z-50 space-y-2">
      {items.map((i) => (
        <div key={i.id} className="card px-4 py-2 text-sm shadow-soft">
          {i.message}
        </div>
      ))}
    </div>
  );
}
