import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that strictly require an authenticated session
const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/diagnostic',
  '/graph',
  '/learn',
  '/review',
  '/workspace',
];

// Routes accessible only when NOT authenticated
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let user = null;

  // Validate server session token via Supabase Auth
  if (url && key && !url.includes('xyzxyz') && !url.includes('placeholder')) {
    try {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      // Cryptographically verify identity with Supabase Auth server
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  const isProtected = PROTECTED_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuth = AUTH_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Security Gate: Reject unauthenticated access to protected pages
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    // Validate target route before setting query param to prevent open redirects
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      redirectUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect already authenticated users away from login/register pages
  if (user && isAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
