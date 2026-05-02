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

// Basic email shape — RFC compliance is impractical, this catches obvious junk
// and keeps payload size sane. Length cap matches RFC 5321's 254-char limit.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addEmailToAllowlist(formData: FormData) {
  await assertAdmin();
  if (!(formData instanceof FormData)) {
    throw new Error('formData required');
  }
  const email = String(formData.get('email') || '').toLowerCase().trim();
  if (!email) return;
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new Error('invalid email');
  }
  const admin = createSupabaseAdminClient();
  await admin.from('email_allowlist').insert({ email, added_by: 'admin-ui' }).throwOnError();
  revalidatePath('/admin/allowlist');
}

export async function removeEmailFromAllowlist(email: string) {
  await assertAdmin();
  if (!email || typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new Error('invalid email');
  }
  const admin = createSupabaseAdminClient();
  await admin.from('email_allowlist').delete().eq('email', email);
  revalidatePath('/admin/allowlist');
}
