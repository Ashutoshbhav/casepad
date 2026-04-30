'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    throw new Error('not admin');
  }
  return user;
}

export async function addEmailToAllowlist(formData: FormData) {
  await assertAdmin();
  const email = String(formData.get('email') || '').toLowerCase().trim();
  if (!email) return;
  const admin = createSupabaseAdminClient();
  await admin.from('email_allowlist').insert({ email, added_by: 'admin-ui' }).throwOnError();
  revalidatePath('/admin/allowlist');
}

export async function removeEmailFromAllowlist(email: string) {
  await assertAdmin();
  const admin = createSupabaseAdminClient();
  await admin.from('email_allowlist').delete().eq('email', email);
  revalidatePath('/admin/allowlist');
}
