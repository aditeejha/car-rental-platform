'use client';
import { useEffect, useState } from 'react';

// SSR-safe: start in a neutral "mounted=false" state so the server-rendered
// markup and the first client render always match. After mount we read the
// real navigator.onLine and subscribe to online/offline events.
export default function useOnline() {
  const [mounted, setMounted] = useState(false);
  const [online, setOnline]   = useState(true);

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', dn);
    };
  }, []);

  // Until we have mounted on the client, claim "online" — matches server.
  return mounted ? online : true;
}
