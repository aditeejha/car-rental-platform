'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, setToken } from '../lib/api';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api('/auth/me');
      setUser(me.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const signup = async (payload) => {
    const r = await api('/auth/signup', { method: 'POST', body: payload });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      // Bust any per-user caches so the next signed-in user starts clean.
      try { localStorage.removeItem('trustly:fav:cache'); } catch { /* ignore */ }
    }
  };

  return { user, loading, login, signup, logout, refresh };
}
