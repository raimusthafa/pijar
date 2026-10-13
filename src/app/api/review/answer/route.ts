import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyReview, type ReviewRow } from '@/lib/scheduler/engine';

// POST { graphId, results: [{ nodeId, correct }] } -> { persisted, updated: [{ nodeId, stability_days, review_count }] }
// Updates node_progress review columns. If the migration is not applied yet, the update errors and persisted=false.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { graphId, results } = await request.json();
  if (!graphId || !Array.isArray(results)) {
    return NextResponse.json({ success: false, error: 'graphId dan results wajib diisi' }, { status: 400 });
  }
  const now = new Date();
  const updated: { nodeId: string; stability_days: number; review_count: number }[] = [];
  let persisted = true;
  for (const r of results as { nodeId: string; correct: boolean }[]) {
    const { data: row, error } = await supabase.from('node_progress').select('*')
      .eq('user_id', user.id).eq('graph_id', graphId).eq('node_id', r.nodeId).maybeSingle();
    if (error || !row) continue;
    const next = applyReview(row as ReviewRow, !!r.correct, now);
    const { error: upErr } = await supabase.from('node_progress').update(next)
      .eq('user_id', user.id).eq('graph_id', graphId).eq('node_id', r.nodeId);
    if (upErr) persisted = false;
    updated.push({ nodeId: r.nodeId, stability_days: next.stability_days, review_count: next.review_count });
  }
  return NextResponse.json({ success: true, persisted, updated });
}
