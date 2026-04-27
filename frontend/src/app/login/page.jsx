'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();
  const [mode, setMode]   = useState('login');
  const [email, setEmail] = useState('demo@user.com');
  const [pwd, setPwd]     = useState('password123');
  const [name, setName]   = useState('');
  const [err, setErr]     = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'login') await login(email, pwd);
      else await signup({ email, password: pwd, fullName: name || email.split('@')[0] });
      router.push('/dashboard');
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="max-w-md mx-auto card p-6">
      <div className="h-10 w-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-4">
        <ShieldCheck size={20}/>
      </div>
      <h1 className="text-xl font-semibold text-slate-100">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="text-sm text-slate-400">Use the seeded demo account or create a new one.</p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="text-xs text-slate-400">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400">Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-slate-400">Password</label>
          <input type="password" className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8}/>
        </div>
        <button className="btn-primary w-full">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        {err && <p className="text-sm text-rose-400">{err}</p>}
      </form>

      <button
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="mt-4 w-full text-sm text-brand-300 hover:text-brand-200"
      >
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>

      <div className="mt-4 pt-4 border-t border-ink-600 text-[11px] text-slate-500 space-y-1">
        <p><span className="font-semibold text-slate-300">Demo accounts</span> · password is anything</p>
        <p><code>demo@user.com</code> · renter</p>
        <p><code>demo@owner.com</code> · owner</p>
        <p><code>admin@demo.com</code> · admin</p>
      </div>
    </div>
  );
}
