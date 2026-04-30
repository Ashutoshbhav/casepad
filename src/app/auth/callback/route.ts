import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isEmailAllowed } from '@/lib/auth/allowlist';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/auth/signin', req.url));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const admin = createSupabaseAdminClient();
  const allowed = await isEmailAllowed(admin, data.user.email);
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/auth/no-access', req.url));
  }
  return NextResponse.redirect(new URL('/cases', req.url));
}
