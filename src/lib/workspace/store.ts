// Server-side workspace persistence. Uses the user's session client, so RLS applies; user_id is also checked explicitly.
import { createClient } from '@/lib/supabase/server';
import type { Phase } from './five-e';

export type Supa = Awaited<ReturnType<typeof createClient>>;
export type Workspace = { id: string; user_id: string; graph_id: string; node_id: string; phase: Phase; created_at: string; updated_at: string };
export type WsEvent = {
  id: string; workspace_id: string; user_id: string; kind: 'chat' | 'quiz' | 'image' | 'canvas' | 'phase';
  role: 'user' | 'assistant'; content: string; image_path: string | null; meta: Record<string, unknown>; created_at: string;
};

export class MigrationMissing extends Error {}
type PgErr = { code?: string; message: string } | null;

function check(error: PgErr) {
  if (!error) return;
  if (error.code === '42P01' || error.code === 'PGRST205') throw new MigrationMissing('workspace tables missing');
  throw new Error(error.message);
}

export async function getOrCreateWorkspace(s: Supa, userId: string, graphId: string, nodeId: string) {
  const found = await s.from('workspaces').select('*').eq('user_id', userId).eq('graph_id', graphId).eq('node_id', nodeId)
    .order('created_at').limit(1).maybeSingle();
  check(found.error);
  if (found.data) return found.data as Workspace;
  const ins = await s.from('workspaces').insert({ user_id: userId, graph_id: graphId, node_id: nodeId, phase: 'engage' }).select('*').single();
  check(ins.error);
  return ins.data as Workspace;
}

export async function getWorkspace(s: Supa, userId: string, id: string) {
  const { data, error } = await s.from('workspaces').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  check(error);
  return (data as Workspace) ?? null;
}

export async function listEvents(s: Supa, userId: string, workspaceId: string) {
  const { data, error } = await s.from('workspace_events').select('*').eq('workspace_id', workspaceId).eq('user_id', userId)
    .order('created_at');
  check(error);
  return (data ?? []) as WsEvent[];
}

export async function appendEvent(s: Supa, userId: string, workspaceId: string,
  e: { kind: WsEvent['kind']; role: WsEvent['role']; content?: string; image_path?: string | null; meta?: Record<string, unknown> }) {
  const { data, error } = await s.from('workspace_events')
    .insert({ workspace_id: workspaceId, user_id: userId, content: '', meta: {}, ...e }).select('*').single();
  check(error);
  return data as WsEvent;
}

export async function setPhase(s: Supa, userId: string, id: string, phase: Phase) {
  const { error } = await s.from('workspaces').update({ phase, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  check(error);
}
