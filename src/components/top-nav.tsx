'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/server-actions/sign-out';
import { CasePadLogo } from './casepad-logo';

// HUPR top nav — white sticky bar, hairline divider on the bottom of the
// account dropdown / mobile drawer. Plex Mono uppercase links, ink active
// state, no rounded corners, no Anthropic dark dropdown.
//
// Hidden on /auth/* and /solve/*.

interface Props {
  email: string | null;
  isAdmin: boolean;
}

const PRIMARY_NAV = [
  { href: '/cases', label: 'Cases' },
  { href: '/drills', label: 'Drills' },
  { href: '/cheatsheet', label: 'Cheats' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function TopNav({ email, isAdmin }: Props) {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-account-menu]')) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  const hide = pathname.startsWith('/auth') || pathname.startsWith('/solve');
  if (hide) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== '/cases' && pathname.startsWith(href));

  const accountItemStyle: React.CSSProperties = {
    display: 'block',
    padding: '10px 14px',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-text-primary)',
    textDecoration: 'none',
    transition: 'background-color 180ms ease',
  };

  return (
    <nav
      className="sticky top-0 z-30"
      style={{
        background: 'var(--color-bg-canvas)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-12 h-14 flex items-center justify-between gap-6">
        {/* Wordmark — hand-drawn rough.js asterisk + wordmark + sketchy
            underline. On hover the asterisk spins 360° and the underline
            stretches. Personality on the brand. Links to / home. */}
        <Link
          href="/"
          className="inline-flex items-center"
          style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}
        >
          <CasePadLogo size={22} showUnderline />
        </Link>

        {/* Desktop primary links */}
        <ul className="hidden md:flex items-center gap-7 text-sm">
          {PRIMARY_NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                data-tour={n.href === '/drills' ? 'topnav-drills' : undefined}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: isActive(n.href)
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                  fontWeight: isActive(n.href) ? 700 : 400,
                  textDecoration: 'none',
                  transition: 'color 180ms ease',
                }}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Account menu — desktop */}
          <div data-account-menu className="hidden md:block relative">
            <button
              onClick={() => setAccountOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
              }}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <span
                className="w-7 h-7 flex items-center justify-center"
                style={{
                  background: 'var(--color-text-primary)',
                  color: 'var(--color-bg-canvas)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {(email?.[0] ?? '?').toUpperCase()}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-text-muted)',
                }}
              >
                ▾
              </span>
            </button>
            {accountOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2"
                style={{
                  width: 240,
                  background: 'var(--color-bg-canvas)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  padding: '4px 0',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {email ?? 'Not signed in'}
                </div>
                <Link
                  href="/onboarding/track"
                  style={accountItemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-sunken)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Switch track
                </Link>
                <Link
                  href="/how-it-works"
                  style={accountItemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-sunken)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  How it works
                </Link>
                <Link
                  href="/tutorial"
                  style={accountItemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-sunken)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Take a guided case
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    style={accountItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-sunken)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    Admin
                  </Link>
                )}
                <form
                  action={signOut}
                  style={{ borderTop: '1px solid var(--color-border)', marginTop: 4 }}
                >
                  <button
                    type="submit"
                    style={{
                      ...accountItemStyle,
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-signal-danger)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-sunken)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-1.5"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
            aria-label="Menu"
            aria-expanded={mobileOpen}
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
        <div
          className="md:hidden"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-canvas)',
          }}
        >
          <ul className="max-w-6xl mx-auto px-4 py-2">
            {PRIMARY_NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  style={{
                    display: 'block',
                    padding: '12px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: isActive(n.href)
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    fontWeight: isActive(n.href) ? 700 : 400,
                    background: isActive(n.href) ? 'var(--color-bg-sunken)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6 }}>
              <Link href="/onboarding/track" style={{ display: 'block', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                Switch track
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" style={{ display: 'block', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                How it works
              </Link>
            </li>
            <li>
              <Link href="/tutorial" style={{ display: 'block', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                Take a guided case
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link href="/admin" style={{ display: 'block', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-primary)', fontWeight: 700, textDecoration: 'none' }}>
                  Admin
                </Link>
              </li>
            )}
            <li style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6 }}>
              <form action={signOut}>
                <button
                  type="submit"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-signal-danger)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </form>
            </li>
            <li
              style={{
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-text-muted)',
                textTransform: 'lowercase',
                letterSpacing: 0,
              }}
            >
              {email}
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
