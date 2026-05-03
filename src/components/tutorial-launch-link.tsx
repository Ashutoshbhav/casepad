'use client';

// "Take me through a case" launcher — clears the tour-dismissed flag so the
// solve-overlay tour ALWAYS fires when this button is clicked, even if the
// user previously dismissed it. Otherwise the button silently no-ops for
// returning users.
//
// Default href is /tutorial (the menu picker). Caller can override.

export function TutorialLaunchLink({
  href = '/tutorial',
  children,
  className,
}: { href?: string; children: React.ReactNode; className?: string }) {
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('casepad-solve-tour-seen');
      } catch {}
    }
    window.location.href = href;
  };
  return (
    <a href={href} onClick={click} className={className} data-tour="cases-tutorial-btn">
      {children}
    </a>
  );
}
