import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { publicOrigin } from '@/lib/auth/origin';

// ================================================================
// PIJAR - Server-Side Logout Route Handler
// Terminates the Supabase session and removes all auth/user cookies.
// ================================================================

async function handleSignOut(request: Request) {
  const cookieStore = await cookies();

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase signOut warning:', err);
  }

  // Clear application session cookies
  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (c.name.startsWith('sb-') || c.name.startsWith('pijar_')) {
      cookieStore.delete(c.name);
    }
  }

  return NextResponse.redirect(new URL('/auth/login', publicOrigin(request)), {
    status: 303,
  });
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

export async function GET(request: Request) {
  return handleSignOut(request);
}
