import type { CurriculumNode, CurriculumEdge } from '@/types';
import type {
  EnrichedConceptNode,
  GraphSummaryMetrics,
  PrerequisiteChainResult,
  RecommendationResult,
  DAGValidationResult,
} from './types';

// ================================================================
// PIJAR - Prerequisite-First Graph Engine & Graph Algorithms
// ================================================================

/**
 * Validates DAG integrity: checks node existence, uniqueness, and cycle detection.
 * Semantics: Edge is Prerequisite (source) -> Dependent Concept (target).
 */
export function validateDAG(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
): DAGValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeMap = new Map<string, CurriculumNode>();

  // 1. Check duplicate nodes
  for (const node of nodes) {
    if (!node.id) {
      errors.push('Terdapat node tanpa properti id.');
      continue;
    }
    if (nodeMap.has(node.id)) {
      errors.push(`Duplikasi ID node terdeteksi: "${node.id}".`);
    } else {
      nodeMap.set(node.id, node);
    }
  }

  // 2. Check edges references and duplicates
  const edgeSet = new Set<string>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  for (const edge of edges) {
    const key = `${edge.source}->${edge.target}`;
    if (edgeSet.has(key)) {
      warnings.push(`Duplikasi relasi edge terdeteksi antara "${edge.source}" dan "${edge.target}".`);
      continue;
    }
    edgeSet.add(key);

    if (!nodeMap.has(edge.source)) {
      errors.push(`Edge merujuk ke source node yang tidak ada: "${edge.source}".`);
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Edge merujuk ke target node yang tidak ada: "${edge.target}".`);
    }

    if (edge.source === edge.target) {
      errors.push(`Self-referencing loop terdeteksi pada node "${edge.source}".`);
      continue;
    }

    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // 3. Cycle Detection using Kahn's Algorithm (Topological Sort)
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    visitedCount++;

    const neighbors = adjList.get(curr) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  const hasCycles = visitedCount < nodes.length;
  if (hasCycles) {
    errors.push('Siklus ketergantungan (cycle dependency) terdeteksi dalam graf kurikulum.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasCycles,
  };
}

/**
 * Builds bidirectional adjacency lookup maps.
 * source -> target means: source is prerequisite of target.
 */
export function buildAdjacencyMaps(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
) {
  // prerequisitesMap: nodeId -> list of direct prerequisites (source nodes)
  const prerequisitesMap = new Map<string, string[]>();
  // dependentsMap: nodeId -> list of direct downstream concepts (target nodes)
  const dependentsMap = new Map<string, string[]>();

  for (const n of nodes) {
    prerequisitesMap.set(n.id, []);
    dependentsMap.set(n.id, []);
  }

  for (const e of edges) {
    if (prerequisitesMap.has(e.target)) {
      prerequisitesMap.get(e.target)!.push(e.source);
    }
    if (dependentsMap.has(e.source)) {
      dependentsMap.get(e.source)!.push(e.target);
    }
  }

  return { prerequisitesMap, dependentsMap };
}

/**
 * Traverses all transitive ancestors (all prerequisite concepts up the tree).
 */
export function getAllAncestors(
  nodeId: string,
  prerequisitesMap: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const queue = [...(prerequisitesMap.get(nodeId) || [])];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (!visited.has(curr)) {
      visited.add(curr);
      const parents = prerequisitesMap.get(curr) || [];
      for (const p of parents) {
        if (!visited.has(p)) queue.push(p);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Traverses all transitive descendants (all concepts unlocked downstream).
 */
export function getAllDescendants(
  nodeId: string,
  dependentsMap: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const queue = [...(dependentsMap.get(nodeId) || [])];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (!visited.has(curr)) {
      visited.add(curr);
      const children = dependentsMap.get(curr) || [];
      for (const c of children) {
        if (!visited.has(c)) queue.push(c);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Inspects a node's complete prerequisite chain and blocks.
 */
export function inspectPrerequisiteChain(
  nodeId: string,
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
): PrerequisiteChainResult {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const { prerequisitesMap, dependentsMap } = buildAdjacencyMaps(nodes, edges);

  const directPrerequisites = prerequisitesMap.get(nodeId) || [];
  const allAncestors = getAllAncestors(nodeId, prerequisitesMap);
  const unlockedDownstream = getAllDescendants(nodeId, dependentsMap);

  // Find which prerequisites are not yet completed
  const unresolvedPrerequisites = allAncestors.filter(pId => {
    const pNode = nodeMap.get(pId);
    return !pNode || pNode.status !== 'completed';
  });

  const isBlocked = unresolvedPrerequisites.length > 0;

  return {
    nodeId,
    directPrerequisites,
    allAncestors,
    unresolvedPrerequisites,
    isBlocked,
    unlockedDownstream,
  };
}

/**
 * Recommends the optimal next concept using Pijar's Prerequisite-First heuristic:
 * 1. Unresolved prerequisite gap whose own prerequisites are already completed (highest pedagogical urgency).
 * 2. Unresolved prerequisite gap in progress.
 * 3. Ready concept (unlocked concept whose prerequisites are 100% completed).
 * 4. In progress concept.
 */
export function recommendNextConcept(
  nodes: EnrichedConceptNode[],
  edges: CurriculumEdge[]
): RecommendationResult {
  if (!nodes || nodes.length === 0) {
    return {
      recommendedNode: null,
      reason: 'Tidak ada konsep yang tersedia dalam kurikulum.',
      category: 'all_completed',
    };
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const { prerequisitesMap } = buildAdjacencyMaps(nodes, edges);

  // Helper to check if a node's immediate prerequisites are all completed
  const arePrerequisitesMet = (id: string): boolean => {
    const directParents = prerequisitesMap.get(id) || [];
    return directParents.every(pId => nodeMap.get(pId)?.status === 'completed');
  };

  // 1. Check for prerequisite gap that is unblocked (ready to be closed!)
  const unblockedGaps = nodes.filter(
    n => n.status === 'prerequisite_gap' && arePrerequisitesMet(n.id)
  );

  if (unblockedGaps.length > 0) {
    const target = unblockedGaps[0];
    return {
      recommendedNode: target,
      reason: `Konsep ini terdeteksi sebagai "Akar Kesenjangan" (Prerequisite Gap). Menuntaskan "${target.label}" akan membuka akses ke materi lanjutan berikutnya.`,
      category: 'critical_prerequisite_gap',
    };
  }

  // 2. Check for any in-progress concept
  const inProgressNodes = nodes.filter(n => n.status === 'in_progress');
  if (inProgressNodes.length > 0) {
    const target = inProgressNodes[0];
    return {
      recommendedNode: target,
      reason: `Kamu sedang mempelajari "${target.label}". Lanjutkan untuk menyelesaikan topik ini.`,
      category: 'ready_concept',
    };
  }

  // 3. Check for ready concepts (all prerequisites completed)
  const readyNodes = nodes.filter(
    n => (n.status === 'ready' || n.status === 'prerequisite_gap') && arePrerequisitesMet(n.id)
  );
  if (readyNodes.length > 0) {
    const target = readyNodes[0];
    return {
      recommendedNode: target,
      reason: `Seluruh konsep prasyarat untuk "${target.label}" telah kamu kuasai. Kamu siap melangkah ke materi ini.`,
      category: 'ready_concept',
    };
  }

  // 4. Any other non-completed node
  const remaining = nodes.filter(n => n.status !== 'completed');
  if (remaining.length > 0) {
    const target = remaining[0];
    return {
      recommendedNode: target,
      reason: `Konsep "${target.label}" adalah target kurikulum berikutnya setelah prasyarat diselesaikan.`,
      category: 'ready_concept',
    };
  }

  return {
    recommendedNode: null,
    reason: 'Selamat! Seluruh konsep dalam kurikulum ini telah berhasil kamu kuasai.',
    category: 'all_completed',
  };
}

/**
 * Computes exact summary metrics for display headers and dashboard.
 */
export function computeGraphSummary(
  nodes: CurriculumNode[]
): GraphSummaryMetrics {
  const totalConcepts = nodes.length;
  if (totalConcepts === 0) {
    return {
      totalConcepts: 0,
      masteredCount: 0,
      inProgressCount: 0,
      unresolvedGapsCount: 0,
      readyCount: 0,
      lockedCount: 0,
      completionPercentage: 0,
      estimatedTotalMinutes: 0,
    };
  }

  let masteredCount = 0;
  let inProgressCount = 0;
  let unresolvedGapsCount = 0;
  let readyCount = 0;
  let lockedCount = 0;
  let estimatedTotalMinutes = 0;

  for (const n of nodes) {
    estimatedTotalMinutes += n.estimated_minutes || 0;
    switch (n.status) {
      case 'completed':
        masteredCount++;
        break;
      case 'in_progress':
        inProgressCount++;
        break;
      case 'prerequisite_gap':
        unresolvedGapsCount++;
        break;
      case 'ready':
        readyCount++;
        break;
      case 'locked':
        lockedCount++;
        break;
    }
  }

  const completionPercentage = Math.round((masteredCount / totalConcepts) * 100);

  return {
    totalConcepts,
    masteredCount,
    inProgressCount,
    unresolvedGapsCount,
    readyCount,
    lockedCount,
    completionPercentage,
    estimatedTotalMinutes,
  };
}
