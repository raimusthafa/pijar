// ================================================================
// PIJAR - Adaptive Learning Scheduler Domain Engine (F9)
// Generates personalized, deterministic daily study agendas
// ================================================================

import type { CurriculumNode, CurriculumEdge } from '@/types';
import { buildAdjacencyMaps } from '../graph/engine.ts';

export interface StudyPlanItem {
  id: string;
  nodeId: string;
  conceptLabel: string;
  category: string;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'review';
  rationale: string;
  dayOffset: number; // 0 = Hari Ini, 1 = Besok, 2 = Lusa
  isCompleted: boolean;
}

export interface StudySchedulePlan {
  dailyTargetMinutes: number;
  totalPlannedMinutes: number;
  items: StudyPlanItem[];
  generatedAt: string;
}

/**
 * Generates an adaptive, deterministic study schedule based on user's curriculum DAG.
 * Rules:
 * 1. Never schedule locked concepts.
 * 2. High priority: Unresolved ready gaps (prerequisites met).
 * 3. Medium priority: Ready downstream concepts.
 * 4. Review priority: Concepts completed previously that benefit from review.
 */
export function generateStudySchedule(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[],
  dailyTargetMinutes: number = 45,
  completedTasks: Set<string> = new Set()
): StudySchedulePlan {
  if (!nodes || nodes.length === 0) {
    return {
      dailyTargetMinutes,
      totalPlannedMinutes: 0,
      items: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const { prerequisitesMap } = buildAdjacencyMaps(nodes, edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Partition candidates
  const readyGaps: CurriculumNode[] = [];
  const readyNormal: CurriculumNode[] = [];
  const completedNodes: CurriculumNode[] = [];

  for (const node of nodes) {
    if (node.status === 'completed') {
      completedNodes.push(node);
      continue;
    }

    // Check if truly ready (all prerequisites completed)
    const parents = prerequisitesMap.get(node.id) || [];
    const allParentsDone = parents.every(pId => nodeMap.get(pId)?.status === 'completed');

    if (allParentsDone) {
      if (node.is_gap || node.status === 'prerequisite_gap') {
        readyGaps.push(node);
      } else {
        readyNormal.push(node);
      }
    }
  }

  const items: StudyPlanItem[] = [];
  let currentDay = 0;
  let dayMinutesAccumulated = 0;

  // 1. Schedule Ready Gaps First (Urgent Pedagogical Need)
  for (const gap of readyGaps) {
    const mins = gap.estimated_minutes || 30;
    if (dayMinutesAccumulated + mins > dailyTargetMinutes && items.length > 0) {
      currentDay++;
      dayMinutesAccumulated = 0;
    }

    items.push({
      id: `sched-${gap.id}`,
      nodeId: gap.id,
      conceptLabel: gap.label,
      category: gap.category,
      estimatedMinutes: mins,
      priority: 'high',
      rationale: `Menutup knowledge gap fundamental sebelum melangkah ke konsep tingkat lanjut.`,
      dayOffset: Math.min(2, currentDay),
      isCompleted: completedTasks.has(`sched-${gap.id}`),
    });

    dayMinutesAccumulated += mins;
  }

  // 2. Schedule Ready Normal Concepts
  for (const node of readyNormal) {
    const mins = node.estimated_minutes || 35;
    if (dayMinutesAccumulated + mins > dailyTargetMinutes && items.length > 0) {
      currentDay++;
      dayMinutesAccumulated = 0;
    }

    items.push({
      id: `sched-${node.id}`,
      nodeId: node.id,
      conceptLabel: node.label,
      category: node.category,
      estimatedMinutes: mins,
      priority: 'medium',
      rationale: `Prasyarat konsep ini telah 100% tuntas; saat yang tepat memperluas cakupan materi.`,
      dayOffset: Math.min(2, currentDay),
      isCompleted: completedTasks.has(`sched-${node.id}`),
    });

    dayMinutesAccumulated += mins;
  }

  // 3. If there is spare time and completed nodes exist, schedule 1 quick review
  if (items.length < 3 && completedNodes.length > 0) {
    const reviewNode = completedNodes[0];
    items.push({
      id: `sched-rev-${reviewNode.id}`,
      nodeId: reviewNode.id,
      conceptLabel: `${reviewNode.label} (Ulas Ulang)`,
      category: reviewNode.category,
      estimatedMinutes: 15,
      priority: 'review',
      rationale: `Pengulangan berkala (spaced repetition) untuk memperkuat retensi memori jangka panjang.`,
      dayOffset: 0,
      isCompleted: completedTasks.has(`sched-rev-${reviewNode.id}`),
    });
  }

  const totalPlannedMinutes = items.reduce((acc, it) => acc + it.estimatedMinutes, 0);

  return {
    dailyTargetMinutes,
    totalPlannedMinutes,
    items: items.slice(0, 6), // Top 6 study tasks
    generatedAt: new Date().toISOString(),
  };
}

// ================================================================
// Daily review: Ebbinghaus forgetting curve  R = exp(-days / stability)
// ================================================================

export const DUE_RETENTION = 0.7;
export const MAX_STABILITY_DAYS = 60;

export interface ReviewRow {
  node_id: string;
  status: string;
  last_reviewed_at?: string | null;
  updated_at?: string | null;
  stability_days?: number | null;
  review_count?: number | null;
}

const DAY_MS = 86_400_000;
const lastSeen = (r: ReviewRow) => Date.parse(r.last_reviewed_at || r.updated_at || '') || 0;

export function retention(r: ReviewRow, now: Date = new Date()): number {
  const days = Math.max(0, (now.getTime() - lastSeen(r)) / DAY_MS);
  return Math.exp(-days / Math.max(0.1, r.stability_days ?? 1));
}

export const isDue = (r: ReviewRow, now: Date = new Date()) => retention(r, now) < DUE_RETENTION;

/** Success multiplies stability by 2.2 (cap 60); failure halves it (min 1). Both bump review_count. */
export function applyReview(r: ReviewRow, success: boolean, now: Date = new Date()) {
  const s = r.stability_days ?? 1;
  return {
    last_reviewed_at: now.toISOString(),
    review_count: (r.review_count ?? 0) + 1,
    stability_days: success ? Math.min(MAX_STABILITY_DAYS, s * 2.2) : Math.max(1, s * 0.5),
  };
}

/**
 * Most decayed completed nodes first (due only). If nothing is due, fall back to the
 * current goal node, then the most recently touched node, then any completed node.
 */
export function pickDailyReview(
  rows: ReviewRow[], now: Date = new Date(), max = 5, goalNodeId?: string
): ReviewRow[] {
  const done = rows.filter(r => r.status === 'completed');
  const due = done.filter(r => isDue(r, now)).sort((a, b) => retention(a, now) - retention(b, now));
  if (due.length) return due.slice(0, max);
  const goal = rows.find(r => r.node_id === goalNodeId);
  const recent = [...rows].sort((a, b) => lastSeen(b) - lastSeen(a))[0];
  const pool = [goal, recent, ...done].filter((r): r is ReviewRow => !!r);
  return [...new Map(pool.map(r => [r.node_id, r])).values()].slice(0, max);
}
