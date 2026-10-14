import { NextResponse } from 'next/server';
import { getPostTest } from '@/lib/learn/question-bank';
import { resolveTopic } from '@/lib/learn/node-check';
import { createClient } from '@/lib/supabase/server';

// GET ?topic=&graphId=&nodeId=&label=&language=id -> up to 10 questions (answer keys stripped).
// Grade with POST /api/learn/evaluate-quiz { postTest: true, answers: { [id]: index } }.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const nodeId = q.get('nodeId');
  if (!nodeId) return NextResponse.json({ success: false, error: 'nodeId wajib diisi' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const topic = await resolveTopic(supabase, user?.id, q.get('graphId'), q.get('topic') || 'dsa');
  const items = await getPostTest({
    topic, nodeId, label: q.get('label') || undefined,
    language: q.get('language') === 'en' ? 'en' : 'id',
  });
  return NextResponse.json({
    success: true,
    questions: items.map(({ correctIndex, explanation, ...safe }) => safe),
  });
}
