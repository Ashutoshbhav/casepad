import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { addEmailToAllowlist, removeEmailFromAllowlist } from '@/server-actions/manage-allowlist';

export default async function AllowlistPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return <main className="p-8">Not admin.</main>;
  }
  const admin = createSupabaseAdminClient();
  const { data: rows } = await admin.from('email_allowlist').select('*').order('added_at', { ascending: false });

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Cohort allowlist</h1>
      <form action={addEmailToAllowlist} className="flex gap-2 mb-6">
        <input name="email" type="email" required placeholder="someone@school.edu" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" />
        <button className="px-4 py-2 bg-white text-zinc-900 rounded text-sm font-medium">Add</button>
      </form>
      <ul className="rounded border border-zinc-800 divide-y divide-zinc-800">
        {(rows ?? []).map((r) => (
          <li key={r.email} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{r.email}</span>
            <form action={removeEmailFromAllowlist.bind(null, r.email)}>
              <button className="text-xs text-rose-400 hover:underline">remove</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
