export interface GraphNodeLite { id: string; label?: string; category?: string; description?: string }

/** Only real stored graphs (uuid ids) can be checked; 'demo-graph' and other local ids have no row. */
export const isStoredGraphId = (graphId: unknown): graphId is string => typeof graphId === 'string' && graphId.length >= 32 && graphId !== 'demo-graph';

/** The node of a stored graph, or null when the graph has no such concept. */
export function findGraphNode(nodes: unknown, nodeId: string): GraphNodeLite | null {
  if (!Array.isArray(nodes)) return null;
  return (nodes as GraphNodeLite[]).find((n) => n && n.id === nodeId) ?? null;
}
