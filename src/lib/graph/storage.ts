import { createClient } from '@/lib/supabase/client';
import type { CurriculumEdge } from '@/types';
import type { EnrichedConceptNode } from './types';

// ================================================================
// PIJAR - Graph & Concept Mastery Persistence Store
// Handles localStorage fallback and Supabase cloud sync seamlessly.
// ================================================================

function normalizeTopicKey(topic: string): string {
  const t = topic.toLowerCase();
  if (t.includes('machine') || t.includes('ml') || t.includes('ai')) return 'ml';
  if (t.includes('data') && t.includes('base') || t.includes('db') || t.includes('sql')) return 'db';
  if (t.includes('math') || t.includes('diskrit') || t.includes('matematika')) return 'math';
  if (t.includes('web') || t.includes('react') || t.includes('frontend')) return 'web';
  if (t.includes('stat') || t.includes('probabilitas')) return 'stats';
  return 'dsa';
}

/**
 * Retrieves the list of mastered node IDs for a specific curriculum topic.
 */
export function getMasteredNodes(topic: string): string[] {
  if (typeof window === 'undefined') return [];
  const key = `pijar_mastered_${normalizeTopicKey(topic)}`;
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Marks a concept node as mastered after passing the learning checkpoint quiz.
 * Persists to localStorage and async updates Supabase node_progress if authenticated.
 */
export async function markNodeMastered(topic: string, nodeId: string): Promise<string[]> {
  if (typeof window === 'undefined') return [nodeId];

  const norm = normalizeTopicKey(topic);
  const key = `pijar_mastered_${norm}`;
  const current = new Set(getMasteredNodes(topic));
  current.add(nodeId);
  const updatedList = Array.from(current);

  try {
    const jsonStr = JSON.stringify(updatedList);
    localStorage.setItem(key, jsonStr);
    sessionStorage.setItem(key, jsonStr);
  } catch (storageErr) {
    console.warn('LocalStorage save failed:', storageErr);
  }

  // Attempt Supabase node_progress update (non-blocking)
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Find active graph ID if exists
      const { data: graph } = await supabase
        .from('learning_graphs')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic', topic)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (graph?.id) {
        await supabase
          .from('node_progress')
          .upsert({
            user_id: user.id,
            graph_id: graph.id,
            node_id: nodeId,
            status: 'completed',
            score: 100,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,graph_id,node_id' });
      }
    }
  } catch (syncErr) {
    console.warn('Supabase node progress sync skipped (offline or unauthenticated):', syncErr);
  }

  return updatedList;
}

/**
 * Persists active knowledge graph structure and registers active topic cookie for dashboard.
 */
export async function saveActiveGraph(
  topic: string,
  graphId: string,
  nodes: EnrichedConceptNode[],
  edges: CurriculumEdge[]
): Promise<void> {
  if (typeof window === 'undefined') return;

  const norm = normalizeTopicKey(topic);
  const storageKey = `pijar_graph_${norm}`;

  // 1. Local persistence
  try {
    const payload = JSON.stringify({ graphId, topic, nodes, edges, updatedAt: Date.now() });
    localStorage.setItem(storageKey, payload);
    sessionStorage.setItem(storageKey, payload);

    // Save lightweight cookie for Server Components (Dashboard)
    document.cookie = `pijar_active_topic=${encodeURIComponent(topic)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `pijar_active_topic_key=${encodeURIComponent(norm)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `pijar_active_graph_id=${encodeURIComponent(graphId)}; path=/; max-age=604800; SameSite=Lax`;
  } catch (localErr) {
    console.warn('Local graph persistence warning:', localErr);
  }

  // 2. Supabase persistence (non-blocking)
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('learning_graphs')
        .upsert({
          user_id: user.id,
          topic,
          nodes_json: nodes,
          edges_json: edges,
          status: 'active',
          updated_at: new Date().toISOString(),
        });
    }
  } catch (cloudErr) {
    console.warn('Supabase graph save skipped (offline/unauthenticated):', cloudErr);
  }
}

/**
 * Loads cached active graph structure if present.
 */
export function getActiveGraph(
  topic: string
): { graphId: string; nodes: EnrichedConceptNode[]; edges: CurriculumEdge[] } | null {
  if (typeof window === 'undefined') return null;

  const norm = normalizeTopicKey(topic);
  const storageKey = `pijar_graph_${norm}`;

  try {
    const raw = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
