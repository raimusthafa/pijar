// ================================================================
// PIJAR - Adaptive pretest state machine (Wicara-style, pure)
// Correct   -> harder validation item on the same node.
// Incorrect -> easier check on the same node AND expand to its prerequisites
//              (up to MAX_DEPTH levels above the goal node).
// Stops at MAX_QUESTIONS or when nothing is left to ask.
// State is plain JSON so it can round-trip through the client.
// ================================================================

import { buildAdjacencyMaps } from '../graph/engine.ts';
import type { CurriculumNode, CurriculumEdge } from '../../types/index.ts';

export type Level = 'easy' | 'medium' | 'hard';
const LEVELS: Level[] = ['easy', 'medium', 'hard'];
export const MAX_QUESTIONS = 10;
export const MAX_DEPTH = 2;

export interface AdaptiveItem { nodeId: string; level: Level; depth: number }
export interface AdaptiveAnswer extends AdaptiveItem { correct: boolean }

export interface AdaptiveState {
  goalId: string;
  queue: AdaptiveItem[];            // next items, head first
  answers: AdaptiveAnswer[];
  expanded: string[];               // nodes whose prerequisites were already queued
  depths: Record<string, number>;   // node -> depth below goal (goal = 0)
}

export interface AdaptiveSummary {
  startNodeId: string;
  gaps: { nodeId: string; depth: number; reason: 'wrong_easy' | 'not_mastered' }[];
  mastered: string[];
}

export function initAdaptive(goalId: string): AdaptiveState {
  return { goalId, queue: [{ nodeId: goalId, level: 'medium', depth: 0 }], answers: [], expanded: [], depths: { [goalId]: 0 } };
}

export const currentItem = (s: AdaptiveState): AdaptiveItem | null =>
  s.answers.length >= MAX_QUESTIONS ? null : s.queue[0] ?? null;

/** Record the answer to the current item and return the next state. */
export function answerAdaptive(
  s: AdaptiveState, correct: boolean, nodes: CurriculumNode[], edges: CurriculumEdge[]
): AdaptiveState {
  const item = s.queue[0];
  if (!item) return s;
  let queue = s.queue.slice(1);
  const expanded = [...s.expanded];
  const depths = { ...s.depths };
  const i = LEVELS.indexOf(item.level);
  const answers = [...s.answers, { ...item, correct }];
  const has = (n: string, l: Level) => answers.some(a => a.nodeId === n && a.level === l) || queue.some(q => q.nodeId === n && q.level === l);

  if (correct && i < 2 && !has(item.nodeId, LEVELS[i + 1])) {
    queue = [{ ...item, level: LEVELS[i + 1] }, ...queue];
  }
  if (!correct) {
    if (i > 0 && !has(item.nodeId, LEVELS[i - 1])) queue = [{ ...item, level: LEVELS[i - 1] }, ...queue];
    if (item.depth < MAX_DEPTH && !expanded.includes(item.nodeId)) {
      expanded.push(item.nodeId);
      const { prerequisitesMap } = buildAdjacencyMaps(nodes, edges);
      for (const p of prerequisitesMap.get(item.nodeId) ?? []) {
        if (p in depths) continue; // already scheduled via another path
        depths[p] = item.depth + 1;
        queue = [...queue, { nodeId: p, level: 'medium', depth: item.depth + 1 }];
      }
    }
  }
  return { ...s, queue, answers, expanded, depths };
}

export const isDone = (s: AdaptiveState) => currentItem(s) === null;

/** Start node = deepest tested node that is not mastered (falls back to the goal). */
export function summarize(s: AdaptiveState): AdaptiveSummary {
  const by = new Map<string, AdaptiveAnswer[]>();
  for (const a of s.answers) by.set(a.nodeId, [...(by.get(a.nodeId) ?? []), a]);
  const mastered: string[] = [];
  const gaps: AdaptiveSummary['gaps'] = [];
  for (const [nodeId, list] of by) {
    const ok = (l: Level) => list.some(a => a.level === l && a.correct);
    const depth = s.depths[nodeId] ?? 0;
    // mastered: hard passed, or medium passed and hard never failed
    const hardFailed = list.some(a => a.level === 'hard' && !a.correct);
    if (ok('hard') || (ok('medium') && !hardFailed)) mastered.push(nodeId);
    else gaps.push({ nodeId, depth, reason: list.some(a => a.level === 'easy' && !a.correct) ? 'wrong_easy' : 'not_mastered' });
  }
  gaps.sort((a, b) => b.depth - a.depth);
  return { startNodeId: gaps[0]?.nodeId ?? s.goalId, gaps, mastered };
}
