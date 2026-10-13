import type { CurriculumEdge, CurriculumNode } from '@/types';
import type { ProgressRow } from '@/lib/dashboard/derive';

export interface DashboardGraph {
  id: string;
  topic: string;
  /** Statuses already merged with node_progress. */
  nodes: CurriculumNode[];
  edges: CurriculumEdge[];
}

export interface DashboardHubProps {
  userId: string;
  nowIso: string;
  graphs: DashboardGraph[];
  progress: ProgressRow[];
}
