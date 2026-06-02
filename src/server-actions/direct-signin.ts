'use server';

import { redirect } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────
// DISABLED 2026-06-02 (Wave-1 launch hardening, audit C1).
//
// This action used to mint a magic-link token via the service-role admin API
// and immediately self-verify it — i.e. anyone who knew an allowlisted email
// could instantly sign in AS that person, with no ownership proof. Under
// ALLOWLIST_MODE=open that became full account takeover (type any email,
// including the admin's, → become them).
//
// Auth is now GOOGLE-ONLY (Google proves email ownership; the allowlist gate
// still runs in /auth/callback). The email form is removed from the sign-in
// card. This function is kept as a hard-refusing stub so any stale/crafted
// POST to its action endpoint cannot resurrect the takeover path.
// See docs/BACKEND-AUDIT-2026-06-02.md and the original logic in git history.
// ─────────────────────────────────────────────────────────────────────────

export async function directSignIn(_formData: FormData) {
  redirect('/auth/signin?error=email-disabled');
}
