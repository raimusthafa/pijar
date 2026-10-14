import { NextResponse } from 'next/server';
import { getOrGenerateMaterial } from '@/lib/learn/generator';
import { toLessonLanguage } from '@/lib/learn/cache-key';
import { CURATED_MATERIALS } from '@/lib/learn/curated-materials';
import { findGraphNode, isStoredGraphId, resolveTopic } from '@/lib/learn/node-check';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Optional session check (graceful for demo fallback, enforced for personalization)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      topic: bodyTopic = 'dsa',
      nodeId,
      nodeLabel: bodyLabel,
      nodeCategory: bodyCategory,
      nodeDescription: bodyDescription,
      graphId,
      prerequisites = [],
      forceRegenerate = false,
      language,
    } = body;

    const topic = await resolveTopic(supabase, user?.id, graphId, bodyTopic);

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Parameter nodeId wajib diisi' },
        { status: 400 }
      );
    }

    // The signed-in user's stored graph is the authority: an id that is not in it never gets a lesson or a cache row.
    // Curated topics (no graph row) and local ids skip the check.
    let { nodeLabel, nodeCategory, nodeDescription } = { nodeLabel: bodyLabel, nodeCategory: bodyCategory, nodeDescription: bodyDescription };
    if (user && isStoredGraphId(graphId) && !CURATED_MATERIALS[nodeId]) {
      const { data } = await supabase.from('learning_graphs').select('nodes_json').eq('id', graphId).eq('user_id', user.id).maybeSingle();
      const n = findGraphNode(data?.nodes_json, nodeId);
      if (!n) {
        return NextResponse.json({ success: false, code: 'NODE_NOT_FOUND', error: 'Konsep tidak ditemukan di peta ini' }, { status: 404 });
      }
      // The browser only knows the concept when the graph sits in local storage (a direct link or a new device has none).
      if (!nodeLabel) ({ label: nodeLabel, category: nodeCategory, description: nodeDescription } = n);
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
      topic,
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
