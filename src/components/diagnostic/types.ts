import type { AdaptiveState } from '@/lib/diagnostic/adaptive';
import type { CurriculumEdge, CurriculumNode } from '@/types';

export interface Q {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  nodeId: string;
  label: string;
}

export interface Graph { nodes: CurriculumNode[]; edges: CurriculumEdge[]; goalId: string }

/** What the result screen shows, for the adaptive flow and for the fixed-length fallback alike. */
export interface ResultData {
  answered: number;
  startLabel: string | null;
  gaps: { id: string; label: string; reason: string }[];
  mastered: { id: string; label: string }[];
  graphId: string | null;
}

export type { AdaptiveState };
