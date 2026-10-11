import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Sparkles, ArrowRight, BookOpen, GitBranch, Loader2, LogOut } from 'lucide-react';

export const metadata = {
  title: 'Dashboard — Pijar',
  description: 'Lihat progres belajar dan lanjutkan kurikulummu',
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Strict server-side access control: unauthenticated users are rejected
  if (!user) {
    redirect('/auth/login');
  }

  // Fetch authenticated user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch user's active curriculum learning graphs
  const { data: graphs } = await supabase
    .from('learning_graphs')
    .select('id, topic, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);

  const rawName =
    profile?.name ??
    user.user_metadata?.full_name ??
    user.email?.split('@')[0] ??
    'Pelajar';
  const firstName = rawName.split(' ')[0] ?? 'Pelajar';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg pijar-gradient flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="font-bold text-lg"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Pijar
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.name ?? user.email}
            </span>
            <div className="w-8 h-8 rounded-full pijar-gradient flex items-center justify-center text-white text-xs font-bold">
              {firstName[0]?.toUpperCase() || 'P'}
            </div>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                title="Keluar / Logout"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/60 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Greeting ── */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">Halo, {firstName}! 👋</h1>
          <p className="text-muted-foreground">
            Siap melanjutkan perjalanan belajarmu hari ini?
          </p>
        </div>

        {/* ── Quick Action / Active Curriculums ── */}
        {!graphs || graphs.length === 0 ? (
          <div className="pijar-gradient-soft rounded-3xl p-8 border border-amber-500/20 mb-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1">
              <div className="text-3xl mb-3">🚀</div>
              <h2 className="text-xl font-bold mb-2">Mulai diagnosa pertamamu</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Jawab 5 soal singkat untuk mendapatkan Knowledge Graph kurikulum yang personal.
                Hanya butuh ~3 menit!
              </p>
            </div>
            <Link
              href="/onboarding"
              id="dashboard-start-diagnostic"
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl pijar-gradient text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg"
            >
              Mulai Pre-test <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Kurikulum Aktif</h2>
              <Link
                href="/onboarding"
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Mulai topik baru <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {graphs.map((g) => (
                <Link
                  key={g.id}
                  href={`/graph?id=${encodeURIComponent(g.id)}`}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-amber-400 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{g.topic}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(g.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 hidden sm:inline">
                      Buka Knowledge Graph
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Feature Cards Placeholder ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-border bg-card opacity-60">
            <BookOpen className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Mastery Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Grafik penguasaan konsep dari waktu ke waktu
            </p>
            <span className="inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Segera Hadir
            </span>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card opacity-60">
            <Sparkles className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Komunitas Belajar</h3>
            <p className="text-sm text-muted-foreground">
              Forum diskusi dan tanya jawab dengan sesama
            </p>
            <span className="inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Segera Hadir
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
