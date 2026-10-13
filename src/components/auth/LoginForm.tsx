'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { authErrorKind, emailProblem, passwordProblem, safeNext } from '@/lib/auth/form';
import { Button } from '@/components/ui/button';
import { AuthFrame } from './AuthFrame';
import { Field, PasswordField } from './Field';
import { FormError } from './FormError';

export function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [supabase] = useState(createClient);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    params.get('error') === 'auth_callback_failed' ? t('auth.login.callback.failed') : null,
  );

  const emailErr = touched.email ? emailProblem(email) : null;
  const passErr = touched.password ? passwordProblem(password) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setTouched({ email: true, password: true });
    if (emailProblem(email) || passwordProblem(password)) return;

    setLoading(true);
    setFormError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data?.session) {
        setFormError(t(`auth.err.${error ? authErrorKind(error) : 'unknown'}` as MessageKey));
        setPassword('');
        setLoading(false);
        return;
      }
      router.push(safeNext(params.get('next')));
      router.refresh();
    } catch {
      setFormError(t('auth.err.network'));
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <h1 className="text-h3">{t('auth.login.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('auth.login.subtitle')}</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {formError && <FormError>{formError}</FormError>}
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
          onBlur={() => setTouched((s) => ({ ...s, email: true }))}
          error={emailErr && t(`auth.err.email.${emailErr}` as MessageKey)}
        />
        <PasswordField
          label={t('auth.field.password')}
          name="password"
          autoComplete="current-password"
          value={password}
          disabled={loading}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((s) => ({ ...s, password: true }))}
          error={passErr && t(`auth.err.password.${passErr}` as MessageKey, { min: 0 })}
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {loading ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.login.switch.prompt')}{' '}
        <Link
          href="/auth/register"
          className="font-medium text-foreground underline underline-offset-4 decoration-hairline-strong hover:decoration-foreground"
        >
          {t('auth.login.switch.cta')}
        </Link>
      </p>
    </AuthFrame>
  );
}
