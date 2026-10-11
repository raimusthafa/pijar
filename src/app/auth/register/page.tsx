'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const BENEFITS = [
  'Diagnosa knowledge gap secara otomatis',
  'Knowledge Graph kurikulum yang personal',
  'AI Tutor kontekstual per materi',
  'Gratis selamanya untuk fitur inti',
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Masukkan format alamat email yang valid.');
      return;
    }

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/onboarding` : undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError('Pendaftaran tidak dapat diselesaikan. Silakan coba kembali.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // If user has session directly, redirect to onboarding; otherwise allow email verification
      setTimeout(() => {
        router.push(data.session ? '/onboarding' : '/auth/login?registered=true');
        router.refresh();
      }, 1500);
    } catch (networkErr: unknown) {
      console.error('Registration network error:', networkErr);
      setError('Gagal terhubung ke layanan autentikasi. Periksa koneksi internet Anda.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background text-foreground">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-muted-foreground text-sm">
            Menyiapkan ruang belajarmu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Left Panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 pijar-gradient-hero flex-col items-center justify-center px-16">
        <div className="max-w-sm">
          <div className="w-14 h-14 rounded-2xl pijar-gradient flex items-center justify-center mb-6 shadow-xl">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Mulai belajar lebih cerdas
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Bergabung dengan Pijar dan rasakan perbedaan belajar adaptif berbasis AI.
          </p>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pijar</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Buat akun gratis</h1>
          <p className="text-muted-foreground text-sm mb-6">Mulai diagnosa dalam 2 menit</p>

          {error && (
            <div
              id="register-error-alert"
              role="alert"
              className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium mb-1.5">Nama lengkap</label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-muted-foreground/60 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5">Email</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-muted-foreground/60 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5">
                Password <span className="text-muted-foreground font-normal">(min. 8 karakter)</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-muted-foreground/60 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length > i * 3
                          ? password.length < 8
                            ? 'bg-orange-400'
                            : 'bg-emerald-500'
                          : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60 mt-2 shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Mendaftarkan...
                </>
              ) : (
                <>
                  Buat Akun <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Dengan mendaftar, kamu menyetujui{' '}
            <Link href="/" className="underline hover:text-foreground">Syarat & Ketentuan</Link>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Sudah punya akun?{' '}
            <Link href="/auth/login" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
