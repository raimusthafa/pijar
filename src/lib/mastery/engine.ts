// ================================================================
// PIJAR - Concept Mastery Domain Engine (F8)
// Pure, deterministic computation of curriculum mastery statistics
// ================================================================

import type { CurriculumNode, CurriculumEdge } from '@/types';
import { buildAdjacencyMaps, recommendNextConcept } from '../graph/engine.ts';
import type { EnrichedConceptNode } from '../graph/types';

/** Score (percent) that must be EXCEEDED to mark a node mastered. Single source of truth. */
export const MASTERY_THRESHOLD = 70;
export const MAX_POST_TEST_ITEMS = 10;
export const isMastered = (scorePercent: number) => scorePercent > MASTERY_THRESHOLD;

export interface CategoryMastery {
  category: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface MasteryBottleneck {
  nodeId: string;
  label: string;
  category: string;
  blockedDownstreamCount: number;
  blockedDownstreamLabels: string[];
}

export interface MasterySummaryMetrics {
  totalConcepts: number;
  completedConcepts: number;
  readyConcepts: number;
  lockedConcepts: number;
  gapConcepts: number;
  completionPercentage: number;
  categoryBreakdown: CategoryMastery[];
  masteredNodeIds: string[];
  bottlenecks: MasteryBottleneck[];
  recommendedNextNode: EnrichedConceptNode | null;
  recommendationReason: string;
}

/**
 * Computes deterministic mastery and completion statistics from curriculum nodes and edges.
 */
export function computeMasteryMetrics(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
): MasterySummaryMetrics {
  if (!nodes || nodes.length === 0) {
    return {
      totalConcepts: 0,
      completedConcepts: 0,
      readyConcepts: 0,
      lockedConcepts: 0,
      gapConcepts: 0,
      completionPercentage: 0,
      categoryBreakdown: [],
      masteredNodeIds: [],
      bottlenecks: [],
      recommendedNextNode: null,
      recommendationReason: 'Belum ada konsep dalam kurikulum.',
    };
  }

  const total = nodes.length;
  let completed = 0;
  let ready = 0;
  let locked = 0;
  let gap = 0;

  const categoryMap = new Map<string, { total: number; completed: number }>();
  const masteredIds: string[] = [];
  const nodeMap = new Map<string, CurriculumNode>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);

    if (node.status === 'completed') {
      completed++;
      masteredIds.push(node.id);
    } else if (node.status === 'ready') {
      ready++;
    } else if (node.status === 'locked') {
      locked++;
    }

    if (node.is_gap || node.status === 'prerequisite_gap') {
      gap++;
    }

    // Category aggregation
    const cat = node.category || 'Umum';
    const curr = categoryMap.get(cat) || { total: 0, completed: 0 };
    curr.total++;
    if (node.status === 'completed') {
      curr.completed++;
    }
    categoryMap.set(cat, curr);
  }

  const completionPercentage = Math.round((completed / total) * 100);

  // Category breakdown
  const categoryBreakdown: CategoryMastery[] = Array.from(categoryMap.entries()).map(
    ([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      percentage: Math.round((stats.completed / stats.total) * 100),
    })
  );

  // Calculate bottlenecks: incomplete nodes that block the most downstream concepts
  const { dependentsMap } = buildAdjacencyMaps(nodes, edges);
  const bottlenecks: MasteryBottleneck[] = [];

  for (const node of nodes) {
    if (node.status !== 'completed') {
      const downstreamIds = dependentsMap.get(node.id) || [];
      const lockedChildren = downstreamIds
        .map(id => nodeMap.get(id))
        .filter((n): n is CurriculumNode => Boolean(n && n.status === 'locked'));

      if (lockedChildren.length > 0) {
        bottlenecks.push({
          nodeId: node.id,
          label: node.label,
          category: node.category,
          blockedDownstreamCount: lockedChildren.length,
          blockedDownstreamLabels: lockedChildren.map(c => c.label),
        });
      }
    }
  }

  // Sort bottlenecks by impact descending
  bottlenecks.sort((a, b) => b.blockedDownstreamCount - a.blockedDownstreamCount);

  // Recommended next concept
  const rec = recommendNextConcept(nodes as EnrichedConceptNode[], edges);

  return {
    totalConcepts: total,
    completedConcepts: completed,
    readyConcepts: ready,
    lockedConcepts: locked,
    gapConcepts: gap,
    completionPercentage,
    categoryBreakdown,
    masteredNodeIds: masteredIds,
    bottlenecks: bottlenecks.slice(0, 3), // Top 3 bottlenecks
    recommendedNextNode: rec.recommendedNode,
    recommendationReason: rec.reason,
  };
}
