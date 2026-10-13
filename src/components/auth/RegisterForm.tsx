'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import {
  PASSWORD_MIN,
  authErrorKind,
  emailProblem,
  isObfuscatedDuplicate,
  nameProblem,
  passwordProblem,
} from '@/lib/auth/form';
import { Button } from '@/components/ui/button';
import { AuthFrame } from './AuthFrame';
import { Field, PasswordField } from './Field';
import { FormError } from './FormError';

const link =
  'font-medium text-foreground underline underline-offset-4 decoration-hairline-strong hover:decoration-foreground';

export function RegisterForm() {
  const { t } = useT();
  const router = useRouter();
  const [supabase] = useState(createClient);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const nameErr = touched.name ? nameProblem(name) : null;
  const emailErr = touched.email ? emailProblem(email) : null;
  const passErr = touched.password ? passwordProblem(password, PASSWORD_MIN) : null;

  const touch = (k: keyof typeof touched) => () => setTouched((s) => ({ ...s, [k]: true }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setTouched({ name: true, email: true, password: true });
    if (nameProblem(name) || emailProblem(email) || passwordProblem(password, PASSWORD_MIN)) return;

    setLoading(true);
    setErrorKind(null);
    const cleanEmail = email.trim();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error || !data?.user || isObfuscatedDuplicate(data.user)) {
        setErrorKind(error ? authErrorKind(error) : data?.user ? 'exists' : 'unknown');
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push('/onboarding');
        router.refresh();
        return;
      }
      setSentTo(cleanEmail);
      setLoading(false);
    } catch {
      setErrorKind('network');
      setLoading(false);
    }
  }

  if (sentTo) {
    return <CheckInbox email={sentTo} onChange={() => setSentTo(null)} />;
  }

  return (
    <AuthFrame>
      <h1 className="text-h3">{t('auth.register.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('auth.register.subtitle')}</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {errorKind && (
          <FormError>
            {t(`auth.err.${errorKind}` as MessageKey)}{' '}
            {errorKind === 'exists' && (
              <Link href="/auth/login" className={link}>
                {t('auth.register.switch.cta')}
              </Link>
            )}
          </FormError>
        )}
        <Field
          label={t('auth.field.name')}
          name="name"
          autoComplete="name"
          value={name}
          placeholder={t('auth.field.name.placeholder')}
          disabled={loading}
          onChange={(e) => setName(e.target.value)}
          onBlur={touch('name')}
          error={nameErr && t(`auth.err.name.${nameErr}` as MessageKey)}
        />
        <Field
          label={t('auth.field.email')}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder={t('auth.field.email.placeholder')}
          disabled={loading}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={touch('email')}
          error={emailErr && t(`auth.err.email.${emailErr}` as MessageKey)}
        />
        <PasswordField
          label={t('auth.field.password')}
          name="password"
          autoComplete="new-password"
          value={password}
          disabled={loading}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={touch('password')}
          hint={
            password && password.length < PASSWORD_MIN
              ? t('auth.password.count', { n: password.length, min: PASSWORD_MIN })
              : t('auth.password.hint', { min: PASSWORD_MIN })
          }
          error={passErr && t(`auth.err.password.${passErr}` as MessageKey, { min: PASSWORD_MIN })}
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {loading ? t('auth.register.submitting') : t('auth.register.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.register.switch.prompt')}{' '}
        <Link href="/auth/login" className={link}>
          {t('auth.register.switch.cta')}
        </Link>
      </p>
    </AuthFrame>
  );
}

/** Shown after sign-up while email confirmation is on. */
function CheckInbox({ email, onChange }: { email: string; onChange: () => void }) {
  const { t } = useT();
  const [supabase] = useState(createClient);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function resend() {
    setState('sending');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      setState(error ? 'error' : 'sent');
    } catch {
      setState('error');
    }
  }

  return (
    <AuthFrame consent={false}>
      <span className="grid size-11 place-items-center rounded-pill bg-amber text-amber-foreground">
        <MailCheck className="size-5" strokeWidth={1.6} aria-hidden />
      </span>
      <h1 className="mt-6 text-h3">{t('auth.check.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('auth.check.body', { email })}</p>
      <p className="mt-4 text-sm text-muted-foreground">{t('auth.check.spam')}</p>

      <div role="status" className="mt-4 min-h-5 text-sm">
        {state === 'sent' && <span>{t('auth.check.resent')}</span>}
        {state === 'error' && <span className="text-danger">{t('auth.err.resend')}</span>}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button size="lg" onClick={resend} disabled={state === 'sending' || state === 'sent'} aria-busy={state === 'sending'}>
          {state === 'sending' && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {state === 'sending' ? t('auth.check.resending') : t('auth.check.resend')}
        </Button>
        <Button variant="ghost" size="lg" onClick={onChange}>
          {t('auth.check.change')}
        </Button>
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/auth/login" className={link}>
          {t('auth.check.login')}
        </Link>
      </p>
    </AuthFrame>
  );
}
