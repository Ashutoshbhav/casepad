// /design-lab/hupr/* — wraps every HUPR-flavor route.
//
// Hides the global 3D coral asterisk so the photo-led HUPR composition
// reads cleanly. No other layout-level concerns; tokens scoped per
// page via next/font CSS variables.

import { HideAsterisk } from './_components/hide-asterisk';

export default function HuprLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HideAsterisk />
      {children}
    </>
  );
}
