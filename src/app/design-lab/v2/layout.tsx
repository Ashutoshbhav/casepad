// /design-lab/v2/layout.tsx — wraps every v2 route (hub + 5 surfaces).
//
// Sole job: mount HideAsterisk so the production 3D coral asterisk
// (rendered globally in app/layout.tsx) is hidden on every v2 page.
// The v2 system uses a typographic asterisk (✱) in its wordmarks
// — the 3D one is from the prior brand era and doesn't fit.
//
// Production routes (/auth/signin, /dashboard, /cases, /solve, /debrief)
// keep the asterisk because they're outside this layout's reach.

import { HideAsterisk } from './_components/hide-asterisk';

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HideAsterisk />
      {children}
    </>
  );
}
