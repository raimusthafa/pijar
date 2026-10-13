import { NextResponse } from 'next/server';
import { getPostTest } from '@/lib/learn/question-bank';

// GET ?topic=&nodeId=&label=&language=id -> up to 10 questions (answer keys stripped).
// Grade with POST /api/learn/evaluate-quiz { postTest: true, answers: { [id]: index } }.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const nodeId = q.get('nodeId');
  if (!nodeId) return NextResponse.json({ success: false, error: 'nodeId wajib diisi' }, { status: 400 });
  const items = await getPostTest({
    topic: q.get('topic') || 'dsa', nodeId, label: q.get('label') || undefined,
    language: q.get('language') === 'en' ? 'en' : 'id',
  });
  return NextResponse.json({
    success: true,
    questions: items.map(({ correctIndex, explanation, ...safe }) => safe),
  });
}
