import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n/server';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/components/workspace/data';
import { GraphList, GraphListSkeleton, type GraphCard } from '@/components/graph/GraphList';
import { overlayStatus, type ProgressRow } from '@/lib/dashboard/derive';
import type { CurriculumNode } from '@/types';

type SP = Promise<{ id?: string }>;

export default function GraphPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<AppShell><GraphListSkeleton /></AppShell>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: SP }) {
  // Older links still point at /graph?id=...
  const { id } = await searchParams;
  if (id) redirect(`/graph/${encodeURIComponent(id)}`);

  const [{ supabase, shellUser }, { t }] = await Promise.all([requireUser(), getT()]);
  const { data, error } = await supabase
    .from('learning_graphs')
    .select('id, topic, nodes_json, updated_at, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  const rows = data ?? [];
  const ids = rows.map((g) => g.id);
  const { data: prog } = ids.length ? await supabase.from('node_progress').select('*').in('graph_id', ids) : { data: [] };
  const progress = (prog ?? []) as ProgressRow[];

  const graphs: GraphCard[] = rows.map((g) => {
    const mine = progress.filter((p) => p.graph_id === g.id);
    const nodes = overlayStatus((g.nodes_json ?? []) as CurriculumNode[], mine);
    const stamps = mine.map((p) => (p as { updated_at?: string }).updated_at).filter(Boolean) as string[];
    return {
      id: g.id,
      topic: g.topic,
      total: nodes.length,
      done: nodes.filter((n) => n.status === 'completed').length,
      started: nodes.some((n) => n.status === 'in_progress' || n.status === 'completed'),
      gaps: nodes.filter((n) => n.status === 'prerequisite_gap').length,
      activeAt: [...stamps, g.updated_at ?? g.created_at].filter(Boolean).sort().at(-1) ?? null,
    };
  });

  return (
    <AppShell user={shellUser} title={t('graph.title')}>
      <GraphList graphs={graphs} failed={Boolean(error)} />
    </AppShell>
  );
}
