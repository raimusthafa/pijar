import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspace, appendEvent, setPhase, MigrationMissing } from '@/lib/workspace/store';
import { isLast, nextPhase } from '@/lib/workspace/five-e';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  try {
    const ws = await getWorkspace(s, user.id, id);
    if (!ws) return NextResponse.json({ code: 'not_found' }, { status: 404 });
    if (isLast(ws.phase)) return NextResponse.json({ phase: ws.phase, isLast: true, next: 'post-test' });
    const phase = nextPhase(ws.phase);
    await setPhase(s, user.id, id, phase);
    await appendEvent(s, user.id, id, { kind: 'phase', role: 'assistant', content: phase, meta: { from: ws.phase, to: phase } });
    return NextResponse.json({ phase, isLast: isLast(phase) });
  } catch (e) {
    if (e instanceof MigrationMissing) return NextResponse.json({ code: 'migration_missing' }, { status: 503 });
    return NextResponse.json({ code: 'error' }, { status: 500 });
  }
}
