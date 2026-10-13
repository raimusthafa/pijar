import { NextResponse } from 'next/server';
import { generateCurriculumGraph } from '@/lib/diagnostic/engine';
import { pickGoalNode } from '@/lib/diagnostic/adaptive-graph';

// POST { topic, target_goal?, is_practitioner_track?, language? } -> { nodes, edges, goal_node_id }
// Prerequisite graph the adaptive pretest walks (one AI call, procedural fallback inside).
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const topic = String(b.topic || '').trim();
    if (!topic) return NextResponse.json({ success: false, error: 'topic wajib diisi' }, { status: 400 });
    const goal = String(b.target_goal || 'Persiapan Komprehensif').trim() + (b.language === 'en' ? '. Write every label and description in English.' : '');
    const { nodes, edges } = await generateCurriculumGraph({
      topic,
      targetGoal: goal,
      isPractitionerTrack: Boolean(b.is_practitioner_track),
      evaluatedResult: { total: 0, correctCount: 0, confidenceMatrix: { misconceptions: 0, regular_gaps: 0, fragile: 0, solid: 0 }, evaluatedAnswers: [], derivedGaps: [] },
    });
    const goal_node_id = pickGoalNode(nodes, edges);
    if (!goal_node_id) return NextResponse.json({ success: false, error: 'graf kosong' }, { status: 502 });
    return NextResponse.json({ success: true, nodes, edges, goal_node_id });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
