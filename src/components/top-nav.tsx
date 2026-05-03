'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/server-actions/sign-out';

// Persistent top navigation. Mounted on every authenticated page via the
// root layout (server component picks user/admin status, passes here).
//
// Hidden on /auth/* (sign-in flow) and /solve/[caseId]/* (solve arena
// has its own minimal header to maximize chat real estate).

interface Props {
  email: string | null;
  isAdmin: boolean;
}

const PRIMARY_NAV = [
  { href: '/cases', label: 'Cases', icon: '📚' },
  { href: '/drills', label: 'Drills', icon: '🎯' },
  { href: '/cheatsheet', label: 'Cheats', icon: '⚡' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
];

export function TopNav({ email, isAdmin }: Props) {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Close menus on route change.
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Close account dropdown when clicking outside.
  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-account-menu]')) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  // Hide on auth pages + solve arena.
  const hide =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/solve');
  if (hide) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== '/cases' && pathname.startsWith(href));

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/cases" className="flex items-center gap-1.5 text-zinc-100 font-semibold">
            <span className="text-emerald-400">✨</span>
            <span>CasePad</span>
          </Link>

          {/* Desktop primary links */}
          <ul className="hidden md:flex items-center gap-1 text-sm">
            {PRIMARY_NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  data-tour={n.href === '/drills' ? 'topnav-drills' : undefined}
                  className={`px-2.5 py-1.5 rounded transition ${
                    isActive(n.href)
                      ? 'text-emerald-300 bg-emerald-950/40'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <span className="mr-1.5">{n.icon}</span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right cluster: account menu (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-2">
            {/* Account menu — desktop */}
            <div data-account-menu className="hidden md:block relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              >
                <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                  {(email?.[0] ?? '?').toUpperCase()}
                </span>
                <span className="text-zinc-500">▼</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl py-1 text-sm">
                  <div className="px-3 py-2 border-b border-zinc-900 text-[11px] text-zinc-500 truncate">
                    {email ?? 'Not signed in'}
                  </div>
                  <Link href="/onboarding/track" className="block px-3 py-2 text-zinc-300 hover:bg-zinc-900">
                    🎯 Switch track
                  </Link>
                  <Link href="/how-it-works" className="block px-3 py-2 text-zinc-300 hover:bg-zinc-900">
                    📖 How it works
                  </Link>
                  <Link href="/tutorial" className="block px-3 py-2 text-zinc-300 hover:bg-zinc-900">
                    🎓 Take a guided case
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="block px-3 py-2 text-amber-400 hover:bg-zinc-900">
                      ⚙ Admin
                    </Link>
                  )}
                  <form action={signOut} className="border-t border-zinc-900 mt-1">
                    <button type="submit" className="w-full text-left px-3 py-2 text-rose-300 hover:bg-rose-950/30">
                      ↩ Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950">
            <ul className="max-w-6xl mx-auto px-4 py-2 space-y-0.5 text-sm">
              {PRIMARY_NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`block px-3 py-2 rounded ${
                      isActive(n.href)
                        ? 'text-emerald-300 bg-emerald-950/40'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="mr-2">{n.icon}</span>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-zinc-900 pt-1.5 mt-1.5">
                <Link href="/onboarding/track" className="block px-3 py-2 text-zinc-300 hover:bg-zinc-900 rounded">🎯 Switch track</Link>
              </li>
              <li>
                <Link href="/how-it-works" className="block px-3 py-2 text-zinc-300 hover:bg-zinc-900 rounded">📖 How it works</Link>
              </li>
              <li>
                <Link href="/tutorial" className="block px-3 py-2 text-zinc-300 hover:bg-zinc-900 rounded">🎓 Take a guided case</Link>
              </li>
              {isAdmin && (
                <li>
                  <Link href="/admin" className="block px-3 py-2 text-amber-400 hover:bg-zinc-900 rounded">⚙ Admin</Link>
                </li>
              )}
              <li className="border-t border-zinc-900 pt-1.5 mt-1.5">
                <form action={signOut}>
                  <button type="submit" className="w-full text-left px-3 py-2 text-rose-300 hover:bg-rose-950/30 rounded">
                    ↩ Sign out
                  </button>
                </form>
              </li>
              <li className="px-3 py-2 text-[10px] text-zinc-600 truncate">{email}</li>
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
