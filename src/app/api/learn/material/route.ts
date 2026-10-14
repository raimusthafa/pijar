import { NextResponse } from 'next/server';
import { getOrGenerateMaterial } from '@/lib/learn/generator';
import { toLessonLanguage } from '@/lib/learn/cache-key';
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
      nodeLabel: bodyLabel,
      nodeCategory: bodyCategory,
      nodeDescription: bodyDescription,
      graphId,
      prerequisites = [],
      forceRegenerate = false,
      language,
    } = body;

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Parameter nodeId wajib diisi' },
        { status: 400 }
      );
    }

    // The browser only knows the concept when the graph sits in local storage (a direct link or a new device has none),
    // so fall back to the stored graph. Without the label the model would write about a slug.
    let { nodeLabel, nodeCategory, nodeDescription } = { nodeLabel: bodyLabel, nodeCategory: bodyCategory, nodeDescription: bodyDescription };
    if (!nodeLabel && user && typeof graphId === 'string') {
      const { data } = await supabase.from('learning_graphs').select('nodes_json').eq('id', graphId).maybeSingle();
      const n = (data?.nodes_json as { id: string; label?: string; category?: string; description?: string }[] | null)?.find((x) => x.id === nodeId);
      if (n) ({ label: nodeLabel, category: nodeCategory, description: nodeDescription } = n);
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
      language: toLessonLanguage(language),
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
