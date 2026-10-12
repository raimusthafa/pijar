import { NextResponse } from 'next/server';
import { getOrGenerateMaterial } from '@/lib/learn/generator';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Optional session check (graceful for demo fallback, enforced for personalization)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      topic = 'dsa',
      nodeId,
      nodeLabel,
      nodeCategory,
      nodeDescription,
      prerequisites = [],
      forceRegenerate = false,
    } = body;

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Parameter nodeId wajib diisi' },
        { status: 400 }
      );
    }

    // 2. Fetch or generate rich material & video script
    const material = await getOrGenerateMaterial({
      topic,
      nodeId,
      nodeLabel,
      nodeCategory,
      nodeDescription,
      prerequisites,
      forceRegenerate,
    });

    return NextResponse.json({
      success: true,
      material,
      authenticated: Boolean(user),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching/generating material:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat materi pembelajaran: ' + msg },
      { status: 500 }
    );
  }
}
