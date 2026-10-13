// ================================================================
// PIJAR - Glue between the adaptive pretest and a prerequisite graph (pure)
// ================================================================

import { buildAdjacencyMaps } from '../graph/engine.ts';
import type { AdaptiveAnswer, AdaptiveSummary } from './adaptive.ts';
import type { CurriculumNode, CurriculumEdge } from '../../types/index.ts';

function ancestorsOf(id: string, prereq: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(prereq.get(id) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(prereq.get(n) ?? []));
  }
  return seen;
}

/** The capstone concept: the sink (nothing depends on it) with the most prerequisites. */
export function pickGoalNode(nodes: CurriculumNode[], edges: CurriculumEdge[]): string | null {
  if (nodes.length === 0) return null;
  const { prerequisitesMap, dependentsMap } = buildAdjacencyMaps(nodes, edges);
  const sinks = nodes.filter(n => (dependentsMap.get(n.id) ?? []).length === 0);
  let best = sinks[0] ?? nodes[nodes.length - 1];
  let bestCount = -1;
  for (const s of sinks) {
    const c = ancestorsOf(s.id, prerequisitesMap).size;
    if (c > bestCount) { best = s; bestCount = c; }
  }
  return best.id;
}

/**
 * Node statuses after the pretest. Mastered nodes and their prerequisites are completed
 * (passing a harder item implies the foundations), gaps are prerequisite_gap, the rest is
 * ready when every direct prerequisite is completed and locked otherwise.
 */
export function applyAdaptiveStatuses<N extends CurriculumNode>(
  nodes: N[], edges: CurriculumEdge[], summary: AdaptiveSummary
): N[] {
  const { prerequisitesMap } = buildAdjacencyMaps(nodes, edges);
  const gaps = new Set(summary.gaps.map(g => g.nodeId));
  const done = new Set<string>();
  for (const m of summary.mastered) {
    if (gaps.has(m)) continue;
    done.add(m);
    for (const a of ancestorsOf(m, prerequisitesMap)) if (!gaps.has(a)) done.add(a);
  }
  return nodes.map(n => {
    if (gaps.has(n.id)) return { ...n, status: 'prerequisite_gap' as const, is_gap: true };
    if (done.has(n.id)) return { ...n, status: 'completed' as const, is_gap: false };
    const ready = (prerequisitesMap.get(n.id) ?? []).every(p => done.has(p));
    return { ...n, status: ready ? ('ready' as const) : ('locked' as const), is_gap: false };
  });
}

/** Which check a gap node failed first, from its answers. Drives the plain-language reason. */
export function gapDetail(answers: AdaptiveAnswer[], nodeId: string): 'easy' | 'hard' | 'medium' | 'mediumEasyOk' {
  const mine = answers.filter(a => a.nodeId === nodeId);
  if (mine.some(a => a.level === 'easy' && !a.correct)) return 'easy';
  if (mine.some(a => a.level === 'hard' && !a.correct)) return 'hard';
  return mine.some(a => a.level === 'easy' && a.correct) ? 'mediumEasyOk' : 'medium';
}
