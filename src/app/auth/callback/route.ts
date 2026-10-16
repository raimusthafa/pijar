import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { safeNext } from '@/lib/auth/form';
import { publicOrigin } from '@/lib/auth/origin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code  = searchParams.get('code');
  const next  = safeNext(searchParams.get('next'), '/onboarding');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
