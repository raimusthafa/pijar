import type { CurriculumNode, CurriculumEdge } from '../../types/index.ts';
import type { EnrichedConceptNode } from './types.ts';
import { buildAdjacencyMaps } from './engine.ts';

// ================================================================
// PIJAR - Deterministic Topological Hierarchical Graph Layout
// Left-to-Right DAG Layout (Prerequisites on Left -> Dependents on Right)
// ================================================================

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  rankSpacing?: number;
  nodeSpacing?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 260,
  nodeHeight: 110,
  rankSpacing: 130,
  nodeSpacing: 45,
  startX: 80,
  startY: 60,
};

/**
 * Calculates a deterministic, layered Left-to-Right layout for prerequisite DAGs.
 */
export function calculateHierarchicalLayout(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[],
  options: LayoutOptions = {}
): EnrichedConceptNode[] {
  if (!nodes || nodes.length === 0) return [];

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { prerequisitesMap } = buildAdjacencyMaps(nodes, edges);

  // 1. Calculate topological rank for each node (longest distance from a root)
  // Roots (nodes with 0 prerequisites) get rank 0.
  const rankMap = new Map<string, number>();

  // Memoized recursive rank with cycle detection guard
  const visitedInBranch = new Set<string>();

  const computeRank = (nodeId: string): number => {
    if (rankMap.has(nodeId)) return rankMap.get(nodeId)!;
    if (visitedInBranch.has(nodeId)) return 0; // Break cycle

    visitedInBranch.add(nodeId);
    const parents = prerequisitesMap.get(nodeId) || [];

    let maxParentRank = -1;
    for (const parentId of parents) {
      const pRank = computeRank(parentId);
      if (pRank > maxParentRank) {
        maxParentRank = pRank;
      }
    }

    visitedInBranch.delete(nodeId);
    const myRank = maxParentRank + 1;
    rankMap.set(nodeId, myRank);
    return myRank;
  };

  for (const node of nodes) {
    computeRank(node.id);
  }

  // 2. Group nodes by rank
  const rankGroups = new Map<number, CurriculumNode[]>();
  let maxRank = 0;

  for (const node of nodes) {
    const rank = rankMap.get(node.id) ?? 0;
    if (rank > maxRank) maxRank = rank;

    if (!rankGroups.has(rank)) {
      rankGroups.set(rank, []);
    }
    rankGroups.get(rank)!.push(node);
  }

  // Find max nodes in any single rank to calculate canvas vertical height
  let maxNodesInRank = 0;
  for (const group of rankGroups.values()) {
    if (group.length > maxNodesInRank) {
      maxNodesInRank = group.length;
    }
  }

  const maxHeight = maxNodesInRank * opts.nodeHeight + (maxNodesInRank - 1) * opts.nodeSpacing;

  // 3. Assign (x, y) coordinates
  const positionedNodes: EnrichedConceptNode[] = [];

  for (let rank = 0; rank <= maxRank; rank++) {
    const group = rankGroups.get(rank) || [];
    if (group.length === 0) continue;

    // Stable sort within rank: gaps first, then ready, then others by ID
    const sortedGroup = [...group].sort((a, b) => {
      if (a.is_gap && !b.is_gap) return -1;
      if (!a.is_gap && b.is_gap) return 1;
      return a.id.localeCompare(b.id);
    });

    const groupHeight = sortedGroup.length * opts.nodeHeight + (sortedGroup.length - 1) * opts.nodeSpacing;
    // Vertically center this rank relative to the maxHeight
    const startY = opts.startY + Math.max(0, (maxHeight - groupHeight) / 2);

    for (let index = 0; index < sortedGroup.length; index++) {
      const node = sortedGroup[index];
      const x = opts.startX + rank * (opts.nodeWidth + opts.rankSpacing);
      const y = startY + index * (opts.nodeHeight + opts.nodeSpacing);

      positionedNodes.push({
        ...node,
        x,
        y,
      });
    }
  }

  return positionedNodes;
}
