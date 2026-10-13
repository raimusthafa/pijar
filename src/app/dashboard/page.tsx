import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { AppShell, PageBody, PageHeader } from '@/components/shell/AppShell';
import { DashboardTabbedHub } from '@/components/dashboard/DashboardTabbedHub';
import { Skeleton } from '@/components/ui/skeleton';
import { overlayStatus, type ProgressRow } from '@/lib/dashboard/derive';
import type { CurriculumEdge, CurriculumNode } from '@/types';

export default function DashboardPage() {
  return (
    <Suspense fallback={<AppShell><DashboardSkeleton /></AppShell>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mx-auto w-full max-w-[var(--pj-content-max)] px-5 pt-8 pb-6 md:px-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <PageBody className="grid gap-4">
        <Skeleton className="h-10 w-80 max-w-full rounded-pill" />
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
      </PageBody>
    </>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ t }, { data: profile }, { data: graphs }] = await Promise.all([
    getT(),
    supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    supabase
      .from('learning_graphs')
      .select('id, topic, nodes_json, edges_json')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const ids = (graphs ?? []).map(g => g.id);
  // select('*') keeps working before the review-columns migration is applied.
  const { data: rows } = ids.length
    ? await supabase.from('node_progress').select('*').eq('user_id', user.id).in('graph_id', ids)
    : { data: [] };
  const progress = (rows ?? []) as ProgressRow[];

  const name = profile?.name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';
  const firstName = String(name).split(' ')[0];

  return (
    <AppShell user={{ name: profile?.name ?? name, email: user.email }} title={t('dashboard.title')}>
      <PageHeader
        title={firstName ? t('dashboard.greeting', { name: firstName }) : t('dashboard.title')}
        description={t('dashboard.greeting.sub')}
      />
      <PageBody>
        <DashboardTabbedHub
          userId={user.id}
          nowIso={new Date().toISOString()}
          progress={progress}
          graphs={(graphs ?? []).map(g => ({
            id: g.id,
            topic: g.topic,
            nodes: overlayStatus((g.nodes_json ?? []) as CurriculumNode[], progress.filter(r => r.graph_id === g.id)),
            edges: (g.edges_json ?? []) as CurriculumEdge[],
          }))}
        />
      </PageBody>
    </AppShell>
  );
}
