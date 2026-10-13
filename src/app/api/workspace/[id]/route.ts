import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspace, listEvents, MigrationMissing } from '@/lib/workspace/store';
import { withSignedUrls } from '@/lib/workspace/signed';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  try {
    const workspace = await getWorkspace(s, user.id, id);
    if (!workspace) return NextResponse.json({ code: 'not_found' }, { status: 404 });
    return NextResponse.json({ workspace, events: await withSignedUrls(s, await listEvents(s, user.id, id)) });
  } catch (e) {
    if (e instanceof MigrationMissing) return NextResponse.json({ code: 'migration_missing' }, { status: 503 });
    return NextResponse.json({ code: 'error' }, { status: 500 });
  }
}
