import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateWorkspace, listEvents, MigrationMissing } from '@/lib/workspace/store';
import { withSignedUrls } from '@/lib/workspace/signed';

export async function POST(request: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const { graphId, nodeId } = body ?? {};
  if (typeof graphId !== 'string' || typeof nodeId !== 'string' || !graphId || !nodeId || nodeId.length > 200) {
    return NextResponse.json({ code: 'bad_request' }, { status: 400 });
  }
  try {
    const workspace = await getOrCreateWorkspace(s, user.id, graphId, nodeId);
    const events = await withSignedUrls(s, await listEvents(s, user.id, workspace.id));
    return NextResponse.json({ workspace, events });
  } catch (e) {
    if (e instanceof MigrationMissing) return NextResponse.json({ code: 'migration_missing' }, { status: 503 });
    return NextResponse.json({ code: 'error' }, { status: 500 });
  }
}
