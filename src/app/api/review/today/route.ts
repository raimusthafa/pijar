import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pickDailyReview, retention, type ReviewRow } from '@/lib/scheduler/engine';
import { getQuestions } from '@/lib/learn/question-bank';
import type { CurriculumNode } from '@/types';

// GET ?graphId=&language=id -> { graphId, items: [{ nodeId, label, retention, question }] }
// question includes correctIndex (self-review is formative). Answer via POST /api/review/answer.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const q = new URL(request.url).searchParams;
  const language = q.get('language') === 'en' ? 'en' : 'id';
  let gq = supabase.from('learning_graphs').select('id, topic, nodes_json').eq('user_id', user.id);
  gq = q.get('graphId') ? gq.eq('id', q.get('graphId')!) : gq.order('created_at', { ascending: false });
  const { data: graph } = await gq.limit(1).maybeSingle();
  if (!graph) return NextResponse.json({ success: true, graphId: null, items: [] });

  // select('*') works whether or not the review columns migration is applied
  const { data: rows } = await supabase.from('node_progress').select('*')
    .eq('user_id', user.id).eq('graph_id', graph.id);
  const labels = new Map(((graph.nodes_json ?? []) as CurriculumNode[]).map(n => [n.id, n.label]));
  const now = new Date();
  const picked = pickDailyReview((rows ?? []) as ReviewRow[], now, 5);

  const items = await Promise.all(picked.map(async r => {
    const [question] = await getQuestions({
      topic: graph.topic, nodeId: r.node_id, label: labels.get(r.node_id), difficulty: 'medium', count: 1, language,
    });
    return { nodeId: r.node_id, label: labels.get(r.node_id) ?? r.node_id, retention: retention(r, now), question };
  }));
  return NextResponse.json({ success: true, graphId: graph.id, items });
}
