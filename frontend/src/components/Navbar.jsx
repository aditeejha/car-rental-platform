'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wifi, WifiOff, Car, ShieldCheck, LayoutDashboard, Compass, Heart } from 'lucide-react';
import useOnline from '../hooks/useOnline';
import useAuth from '../hooks/useAuth';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const online = useOnline();
  const { user, logout } = useAuth();
  const path = usePathname() || '/';

  const link = (href, label, Icon) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${
          active ? 'text-slate-50 bg-ink-700' : 'text-slate-400 hover:text-slate-100 hover:bg-ink-800'
        }`}
      >
        {Icon && <Icon size={15}/>} {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-ink-950/80 backdrop-blur-xl border-b border-ink-700">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-100 tracking-tight">
          <span className="h-8 w-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-glow">
            <Car size={16}/>
          </span>
          <span>Trustly</span>
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          {link('/cars', 'Browse', Compass)}
          {link('/favorites', 'Saved', Heart)}
          {link('/dashboard', 'Dashboard', LayoutDashboard)}
          {user?.role === 'admin' && link('/admin', 'Admin')}
        </div>
        <div className="flex items-center gap-2">
          <span
            title={online ? 'Online' : 'Offline — actions will be queued'}
            className={`chip text-[11px] ${online ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}
          >
            {online ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {online ? 'Online' : 'Offline'}
          </span>
          <NotificationBell user={user}/>
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg bg-ink-800 border border-ink-600">
                <div className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">
                  {user.fullName.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm text-slate-200">{user.fullName.split(' ')[0]}</span>
              </div>
              <button onClick={logout} className="btn-ghost text-sm">Sign out</button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              <ShieldCheck size={16} className="mr-1"/> Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
