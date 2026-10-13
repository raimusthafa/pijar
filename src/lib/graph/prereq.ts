import type { CurriculumEdge } from '../../types/index.ts';

/**
 * Prerequisites of a node up to `depth` levels back (Wicara rule: a diagnosis never goes past two).
 * Returns each ancestor with its level (1 = direct) and the edges that lie on those paths.
 */
export function prerequisitesWithin(nodeId: string, edges: CurriculumEdge[], depth = 2) {
  const level = new Map<string, number>();
  const edgeIds = new Set<string>();
  let frontier = [nodeId];
  for (let d = 1; d <= depth && frontier.length; d++) {
    const next: string[] = [];
    for (const e of edges) {
      if (!frontier.includes(e.target) || e.source === nodeId) continue;
      edgeIds.add(e.id);
      if (!level.has(e.source)) { level.set(e.source, d); next.push(e.source); }
    }
    frontier = next;
  }
  return { level, edgeIds };
}
