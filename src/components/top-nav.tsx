'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/server-actions/sign-out';
import { CasePadLogo } from './casepad-logo';

// HUPR-style top nav for authenticated pages. Logo on the left, MENU pill
// on the right. Click MENU → full slide-in drawer with every nav option
// in one place — Cases / Drills / Cheats / Dashboard up top, then a
// hairline + Tutorial / How it works / Admin (if admin) / Sign out.
//
// This replaces the previous mixed nav (inline links + dark dropdown)
// that conflicted with HuprDesign's own header on /. One nav system,
// one mental model: "click MENU, see everything."
//
// Hidden on:
//   /auth/*    — signin has its own HUPR composition
//   /solve/*   — arena maximizes chat real estate
//   /          — home uses HuprDesign's own header

interface Props {
  email: string | null;
  isAdmin: boolean;
}

const PRIMARY = [
  { href: '/cases', label: 'Cases' },
  { href: '/drills', label: 'Drills' },
  { href: '/cheatsheet', label: 'Cheats' },
  { href: '/dashboard', label: 'Dashboard' },
];

const SECONDARY = [
  { href: '/tutorial', label: 'Take a guided case' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/onboarding/track', label: 'Switch track' },
];

export function TopNav({ email, isAdmin }: Props) {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Body scroll lock while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const hide =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/solve') ||
    pathname === '/';
  if (hide) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== '/cases' && pathname.startsWith(href));

  return (
    <>
      <nav
        className="sticky top-0 z-30"
        style={{
          background: 'var(--color-bg-canvas)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-12 h-14 flex items-center justify-between gap-6">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CasePadLogo size={22} showUnderline />
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: 'transparent',
              border: '1px solid var(--color-text-primary)',
              borderRadius: 999,
              padding: '8px 16px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--color-text-primary)',
              fontWeight: 700,
              transition: 'background-color 180ms ease, color 180ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-text-primary)';
              e.currentTarget.style.color = 'var(--color-bg-canvas)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
          >
            <span>Menu</span>
            <span aria-hidden="true" style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'block', width: 16, height: 1.5, background: 'currentColor' }} />
              <span style={{ display: 'block', width: 16, height: 1.5, background: 'currentColor' }} />
            </span>
          </button>
        </div>
      </nav>

      {/* Backdrop — click outside drawer to close. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,20,21,0.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 320ms cubic-bezier(.32,.72,0,1)',
          zIndex: 40,
        }}
      />

      {/* Drawer — slides in from right. HUPR composition: huge
          Montserrat 700 uppercase links, hairline dividers between
          sections, account email + sign-out at the bottom. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(440px, 92vw)',
          background: 'var(--color-bg-canvas)',
          borderLeft: '1px solid var(--color-border)',
          padding: '5rem 2rem 2rem',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 420ms cubic-bezier(.32,.72,0,1)',
          zIndex: 41,
          overflowY: 'auto',
          boxShadow: open ? '-24px 0 60px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        {/* Close button — top right of drawer */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-primary)',
            padding: 4,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>

        {/* Primary nav */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {PRIMARY.map((m, i) => (
            <li
              key={m.href}
              style={{
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 10,
                marginBottom: 10,
              }}
            >
              <Link
                href={m.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 16,
                  textDecoration: 'none',
                  color: isActive(m.href)
                    ? 'var(--color-text-primary)'
                    : 'rgba(50,50,52,0.85)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: 'clamp(36px, 6vw, 56px)',
                    lineHeight: 1.05,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  0{i + 1}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Secondary — smaller, ghost */}
        <ul
          style={{
            listStyle: 'none',
            margin: '32px 0 0',
            padding: '24px 0 0',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {SECONDARY.map((m) => (
            <li key={m.href} style={{ marginBottom: 6 }}>
              <Link
                href={m.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                {m.label} →
              </Link>
            </li>
          ))}
          {isAdmin && (
            <li>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-primary)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Admin →
              </Link>
            </li>
          )}
        </ul>

        {/* Footer — email + sign-out */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              textTransform: 'lowercase',
            }}
          >
            {email ?? 'Not signed in'}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-signal-danger)',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
