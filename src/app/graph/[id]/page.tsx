import { Suspense } from 'react';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { getT } from '@/lib/i18n/server';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { requireUser } from '@/components/workspace/data';
import { GraphWorkspace, GraphWorkspaceSkeleton } from '@/components/graph/CurriculumCanvas';
import { overlayStatus, type ProgressRow } from '@/lib/dashboard/derive';
import type { CurriculumEdge, CurriculumNode } from '@/types';

type Params = Promise<{ id: string }>;

export default function GraphMapPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<AppShell><GraphWorkspaceSkeleton /></AppShell>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const { supabase, shellUser } = await requireUser();
  const isUuid = /^[0-9a-f-]{32,36}$/i.test(id);
  const { data: graph } = isUuid
    ? await supabase.from('learning_graphs').select('id, topic, nodes_json, edges_json').eq('id', id).maybeSingle()
    : { data: null };

  if (!graph) {
    const { t } = await getT();
    return (
      <AppShell user={shellUser}>
        <EmptyState
          icon={Network}
          title={t('graph.notfound.title')}
          description={t('graph.notfound.desc')}
          action={<Button render={<Link href="/graph" />} nativeButton={false}>{t('graph.notfound.action')}</Button>}
        />
      </AppShell>
    );
  }

  const { data: rows } = await supabase.from('node_progress').select('*').eq('graph_id', graph.id);
  const nodes = overlayStatus((graph.nodes_json ?? []) as CurriculumNode[], (rows ?? []) as ProgressRow[]);

  return (
    <AppShell user={shellUser}>
      <GraphWorkspace graphId={graph.id} topic={graph.topic} nodes={nodes} edges={(graph.edges_json ?? []) as CurriculumEdge[]} />
    </AppShell>
  );
}
