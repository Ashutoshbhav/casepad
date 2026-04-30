'use client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const supabase = createSupabaseBrowserClient();
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-3xl font-semibold">CasePad</h1>
        <p className="text-zinc-400">Cohort access. Sign in with the email on the allowlist.</p>
        <button
          onClick={handleGoogle}
          className="w-full rounded-md bg-white text-zinc-900 py-2 font-medium hover:bg-zinc-200 transition"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
