export interface GraphNodeLite { id: string; label?: string; category?: string; description?: string }

/** Only real stored graphs (uuid ids) can be checked; 'demo-graph' and other local ids have no row. */
export const isStoredGraphId = (graphId: unknown): graphId is string => typeof graphId === 'string' && graphId.length >= 32 && graphId !== 'demo-graph';

/** The node of a stored graph, or null when the graph has no such concept. */
export function findGraphNode(nodes: unknown, nodeId: string): GraphNodeLite | null {
  if (!Array.isArray(nodes)) return null;
  return (nodes as GraphNodeLite[]).find((n) => n && n.id === nodeId) ?? null;
}

type TopicClient = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- structural Supabase client

/** The topic of a stored graph the user owns, so a missing or wrong ?topic can never pick another subject's cache. Anything else keeps `fallback`. */
export async function resolveTopic(supabase: TopicClient, userId: string | undefined, graphId: unknown, fallback: string): Promise<string> {
  if (!userId || !isStoredGraphId(graphId)) return fallback;
  try {
    const { data } = await supabase.from('learning_graphs').select('topic').eq('id', graphId).eq('user_id', userId).maybeSingle();
    return typeof data?.topic === 'string' && data.topic ? data.topic : fallback;
  } catch { return fallback; }
}
