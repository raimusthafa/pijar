import type { CurriculumNode, CurriculumEdge, NodeStatus } from '@/types';

// ================================================================
// PIJAR - Knowledge Graph Domain Types
// ================================================================

export interface EnrichedConceptNode extends CurriculumNode {
  mastery_score?: number;
  justification?: string;
  misconception?: string;
  importance_reason?: string;
  prerequisites?: string[];
  unlocked_concepts?: string[];
  // Layout coordinates for canvas
  x?: number;
  y?: number;
}

export interface GraphSummaryMetrics {
  totalConcepts: number;
  masteredCount: number;
  inProgressCount: number;
  unresolvedGapsCount: number;
  readyCount: number;
  lockedCount: number;
  completionPercentage: number;
  estimatedTotalMinutes: number;
}

export interface PrerequisiteChainResult {
  nodeId: string;
  directPrerequisites: string[];
  allAncestors: string[];
  unresolvedPrerequisites: string[];
  isBlocked: boolean;
  unlockedDownstream: string[];
}

export interface RecommendationResult {
  recommendedNode: EnrichedConceptNode | null;
  reason: string;
  category: 'critical_prerequisite_gap' | 'ready_concept' | 'review_completed' | 'all_completed';
}

export interface DAGValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasCycles: boolean;
  cycles?: string[][];
  isolatedNodeIds?: string[];
}
