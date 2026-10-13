import { Suspense } from 'react';
import { getT } from '@/lib/i18n/server';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser, type GraphRow } from '@/components/workspace/data';
import { WorkspaceList, WorkspaceListSkeleton, type RecentRow, type ReadyRow } from '@/components/workspace/WorkspaceList';
import type { Phase } from '@/lib/workspace/five-e';

export default function WorkspacePage() {
  return (
    <Suspense fallback={<AppShell><WorkspaceListSkeleton /></AppShell>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [{ supabase, shellUser }, { t }] = await Promise.all([requireUser(), getT()]);
  const { data } = await supabase
    .from('learning_graphs')
    .select('id, topic, nodes_json')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);
  const graphs = (data ?? []) as GraphRow[];

  const ready: ReadyRow[] = graphs.flatMap((g) =>
    (g.nodes_json ?? [])
      .filter((n) => n.status === 'ready' || n.status === 'in_progress')
      .map((n) => ({ graphId: g.id, nodeId: n.id, label: n.label, topic: g.topic, minutes: n.estimated_minutes, inProgress: n.status === 'in_progress' })),
  );

  // Recent workspaces. A failure here usually means the tables are not applied yet.
  const ws = await supabase
    .from('workspaces')
    .select('graph_id, node_id, phase, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  const blocked = Boolean(ws.error);
  const recent: RecentRow[] = (ws.data ?? []).map((w) => {
    const g = graphs.find((x) => x.id === w.graph_id);
    const n = g?.nodes_json?.find((x) => x.id === w.node_id);
    return { graphId: w.graph_id, nodeId: w.node_id, label: n?.label ?? w.node_id, topic: g?.topic ?? '', phase: w.phase as Phase };
  });

  return (
    <AppShell user={shellUser} title={t('workspace.title')}>
      <WorkspaceList ready={ready} recent={recent} blocked={blocked} />
    </AppShell>
  );
}
