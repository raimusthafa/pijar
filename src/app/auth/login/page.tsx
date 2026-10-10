'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function handleDemoLogin() {
    setDemoLoading(true);
    setError('');

    // Demo account — ensure this account exists in your Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@pijar.app',
      password: 'pijar-demo-2026',
    });

    if (error) {
      // If demo account doesn't exist, sign up automatically
      const { error: signUpError } = await supabase.auth.signUp({
        email: 'demo@pijar.app',
        password: 'pijar-demo-2026',
        options: { data: { full_name: 'Demo User' } },
      });
      if (signUpError) {
        setError('Demo mode tidak tersedia. Silakan buat akun baru.');
        setDemoLoading(false);
        return;
      }
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel (brand) ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 pijar-gradient-hero flex-col items-center justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 pijar-gradient opacity-10" />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl pijar-gradient flex items-center justify-center mx-auto mb-6 shadow-xl animate-float">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Selamat datang di Pijar
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Platform belajar adaptif yang membangun jalur belajar personal dari diagnosis <em>knowledge gap</em> milikmu.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Konsep Dipetakan', value: '200+' },
              { label: 'Akurasi Diagnosa', value: '94%' },
              { label: 'Lebih Cepat', value: '3×' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl glass">
                <div className="text-2xl font-bold text-pijar-600">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (form) ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pijar</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Masuk ke akunmu</h1>
          <p className="text-muted-foreground text-sm mb-8">Lanjutkan perjalanan belajarmu</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-pijar-600 hover:underline">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/60"
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
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Masuk <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-background text-xs text-muted-foreground">atau</span>
            </div>
          </div>

          <button
            id="demo-login"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-accent transition-all disabled:opacity-60"
          >
            {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-pijar-500" />}
            Masuk sebagai Demo
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Belum punya akun?{' '}
            <Link href="/auth/register" className="font-semibold text-pijar-600 hover:underline">
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
