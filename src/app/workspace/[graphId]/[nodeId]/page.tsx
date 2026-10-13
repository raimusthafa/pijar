import { Suspense } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser, type GraphRow } from '@/components/workspace/data';
import { Workspace } from '@/components/workspace/Workspace';
import { WorkspaceListSkeleton } from '@/components/workspace/WorkspaceList';

type P = Promise<{ graphId: string; nodeId: string }>;

export default function WorkspaceNodePage({ params }: { params: P }) {
  return (
    <Suspense fallback={<AppShell><WorkspaceListSkeleton /></AppShell>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: P }) {
  const { graphId, nodeId } = await params;
  const { supabase, shellUser } = await requireUser();
  const { data } = await supabase.from('learning_graphs').select('id, topic, nodes_json').eq('id', graphId).maybeSingle();
  const g = data as GraphRow | null;
  const node = g?.nodes_json?.find((n) => n.id === nodeId);
  // Unknown graph or node (demo graph, stale link): fall back to a readable title from the id.
  const label = node?.label ?? decodeURIComponent(nodeId).replace(/[-_]/g, ' ');
  return (
    <Workspace
      graphId={graphId}
      nodeId={nodeId}
      user={shellUser}
      concept={{ label, topic: g?.topic ?? '', objective: node?.description ?? '' }}
    />
  );
}
