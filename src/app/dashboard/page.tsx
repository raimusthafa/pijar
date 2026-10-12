import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Sparkles, ArrowRight, BookOpen, GitBranch, Loader2, LogOut } from 'lucide-react';
import { DashboardTabbedHub } from '@/components/dashboard/DashboardTabbedHub';
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from '@/lib/ai/mock-data';

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
  await connection();
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
    .select('id, topic, status, created_at, nodes_json, edges_json')
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

        {/* ── Active Curriculum Hub ── */}
        <DashboardTabbedHub
          graphs={graphs || []}
          userName={profile?.name || rawName}
          defaultNodes={MOCK_GRAPH_NODES}
          defaultEdges={MOCK_GRAPH_EDGES}
          defaultTopicName="Struktur Data & Algoritma"
        />
      </main>
    </div>
  );
}
