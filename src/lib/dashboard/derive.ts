// Pure helpers behind the dashboard and the daily review. No I/O, so they run under node --test.
import type { CurriculumNode, CurriculumEdge } from '@/types';
import { DUE_RETENTION, isDue, retention, type ReviewRow } from '../scheduler/engine.ts';
import { recommendNextConcept } from '../graph/engine.ts';
import type { EnrichedConceptNode } from '../graph/types';

const DAY_MS = 86_400_000;
const seen = (r: ReviewRow) => Date.parse(r.last_reviewed_at || r.updated_at || '') || 0;

export interface ProgressRow extends ReviewRow {
  graph_id: string;
  node_id: string;
  status: string;
}

/** node_progress is the source of truth for status; nodes_json can lag behind it. */
export function overlayStatus(nodes: CurriculumNode[], rows: ReviewRow[]): CurriculumNode[] {
  const byId = new Map(rows.map(r => [r.node_id, r.status]));
  return nodes.map(n => {
    const s = byId.get(n.id);
    return s ? { ...n, status: s as CurriculumNode['status'] } : n;
  });
}

/** Days from the last review until retention falls to the due threshold, for a given stability. */
export const daysUntilDue = (stabilityDays: number) => Math.max(0.1, stabilityDays) * -Math.log(DUE_RETENTION);

/** Days left from now until this concept is due. 0 or less means it is due now. */
export function daysLeft(r: ReviewRow, now: Date): number {
  const elapsed = Math.max(0, (now.getTime() - seen(r)) / DAY_MS);
  return daysUntilDue(r.stability_days ?? 1) - elapsed;
}

export function dueRows<T extends ReviewRow>(rows: T[], now: Date): T[] {
  return rows.filter(r => r.status === 'completed' && isDue(r, now));
}

export interface WeeklyReport {
  mastered: number;
  reviewed: number;
  /** Oldest day first; the last entry is the most recent 24 hours. */
  days: { daysAgo: number; mastered: number; reviewed: number }[];
  hasData: boolean;
}

/** Counts concepts whose latest timestamps fall in the past 7 days. Only the latest event per concept is stored. */
export function weeklyReport(rows: ReviewRow[], now: Date): WeeklyReport {
  const days = Array.from({ length: 7 }, (_, i) => ({ daysAgo: 6 - i, mastered: 0, reviewed: 0 }));
  const bucket = (iso?: string | null) => {
    const t = Date.parse(iso ?? '');
    if (!t) return -1;
    const ago = Math.floor((now.getTime() - t) / DAY_MS);
    return ago >= 0 && ago < 7 ? 6 - ago : -1;
  };
  let mastered = 0;
  let reviewed = 0;
  for (const r of rows) {
    const m = r.status === 'completed' ? bucket(r.updated_at) : -1;
    if (m >= 0) { days[m].mastered++; mastered++; }
    const v = bucket(r.last_reviewed_at);
    if (v >= 0) { days[v].reviewed++; reviewed++; }
  }
  return { mastered, reviewed, days, hasData: mastered + reviewed > 0 };
}

export interface RetentionBar { nodeId: string; label: string; retention: number; daysLeft: number; due: boolean }

/** Completed concepts, weakest memory first. */
export function retentionBars(rows: ReviewRow[], labels: Map<string, string>, now: Date, max = 8): RetentionBar[] {
  return rows
    .filter(r => r.status === 'completed')
    .map(r => ({
      nodeId: r.node_id,
      label: labels.get(r.node_id) ?? r.node_id,
      retention: retention(r, now),
      daysLeft: daysLeft(r, now),
      due: isDue(r, now),
    }))
    .sort((a, b) => a.retention - b.retention)
    .slice(0, max);
}

export type NextKind = 'gap' | 'inProgress' | 'ready' | 'other' | 'done';

/** The next best concept using the graph engine, plus a kind the UI can phrase in either language. */
export function nextStep(nodes: CurriculumNode[], edges: CurriculumEdge[]): { node: CurriculumNode | null; kind: NextKind } {
  const rec = recommendNextConcept(nodes as EnrichedConceptNode[], edges);
  const node = rec.recommendedNode;
  if (!node) return { node: null, kind: 'done' };
  if (rec.category === 'critical_prerequisite_gap') return { node, kind: 'gap' };
  if (node.status === 'in_progress') return { node, kind: 'inProgress' };
  if (node.status === 'ready' || node.status === 'prerequisite_gap') return { node, kind: 'ready' };
  return { node, kind: 'other' };
}
