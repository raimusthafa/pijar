// Pure helpers shared by the login and register forms (kept free of React so node --test can import them).

export const PASSWORD_MIN = 8;

/** Only same-origin paths survive; anything else (absolute URL, //host, backslash tricks) becomes the fallback. */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next;
  return fallback;
}

export function emailProblem(email: string): 'empty' | 'invalid' | null {
  const v = email.trim();
  if (!v) return 'empty';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'invalid';
}

export function nameProblem(name: string): 'empty' | 'short' | null {
  const v = name.trim();
  if (!v) return 'empty';
  return v.length < 2 ? 'short' : null;
}

export function passwordProblem(password: string, min = 0): 'empty' | 'short' | null {
  if (!password) return 'empty';
  return password.length < min ? 'short' : null;
}

export type AuthErrorKind =
  | 'credentials'
  | 'unconfirmed'
  | 'exists'
  | 'weak'
  | 'rate'
  | 'disabled'
  | 'network'
  | 'unknown';

type ErrLike = { message?: string; code?: string; status?: number } | null | undefined;

/** Maps a Supabase auth error (code first, message as fallback) to a kind the UI can translate. */
export function authErrorKind(err: ErrLike): AuthErrorKind {
  if (!err) return 'unknown';
  const code = err.code ?? '';
  const msg = (err.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'credentials';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'unconfirmed';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'exists';
  if (code === 'weak_password' || msg.includes('password should')) return 'weak';
  if (code.startsWith('over_') || err.status === 429 || msg.includes('rate limit')) return 'rate';
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return 'disabled';
  if (msg.includes('fetch') || msg.includes('network')) return 'network';
  return 'unknown';
}

/** With email confirmation on, signing up an existing address returns a user with no identities and no error. */
export function isObfuscatedDuplicate(user: { identities?: unknown[] | null } | null | undefined): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
