import { NextResponse } from 'next/server';
import { answerAdaptive, isDone, summarize, type AdaptiveState } from '@/lib/diagnostic/adaptive';
import { nextAdaptiveQuestion } from '@/lib/diagnostic/adaptive-server';

// POST { adaptive_state, correct, nodes, edges, topic, language? } -> { adaptive_state, next, done, summary? }
export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (!b.adaptive_state || typeof b.correct !== 'boolean' || !Array.isArray(b.nodes) || !Array.isArray(b.edges)) {
      return NextResponse.json({ success: false, error: 'adaptive_state, correct, nodes, edges wajib diisi' }, { status: 400 });
    }
    const state: AdaptiveState = answerAdaptive(b.adaptive_state, b.correct, b.nodes, b.edges);
    const cap = Number(b.max_questions);
    const done = isDone(state) || (cap > 0 && state.answers.length >= cap);
    return NextResponse.json({
      success: true,
      adaptive_state: state,
      done,
      next: done ? null : await nextAdaptiveQuestion(state, b.nodes, b.topic || 'umum', b.language),
      summary: done ? summarize(state) : undefined,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
