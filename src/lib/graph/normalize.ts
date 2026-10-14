import type { CurriculumEdge, CurriculumNode } from '../../types/index.ts';

// ================================================================
// PIJAR - Graph repair. AI graphs (and graphs stored by older builds) are rarely exact:
// edges named from/to, ids that differ in case, prerequisites listed on the node instead of edges,
// cycles, duplicates, dangling endpoints. normalizeGraph always returns a valid DAG with levels.
// ================================================================

type Loose = Record<string, unknown>;
export type LeveledNode = CurriculumNode & { level: number };

const slug = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const asStr = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
const first = (o: Loose, keys: string[]) => keys.map((k) => asStr(o[k])).find(Boolean) ?? '';
const toList = (v: unknown): unknown[] => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.split(/[,;]/) : []);

const STATUSES = ['locked', 'prerequisite_gap', 'ready', 'in_progress', 'completed'];

function tier(category: string): number {
  const c = category.toLowerCase();
  if (/(fondasi|dasar|pengantar|foundation|basic|intro)/.test(c)) return 0;
  if (/(lanjut|mahir|advanced|expert|optimas|capstone|puncak)/.test(c)) return 3;
  if (/(penerapan|terap|aplikasi|application|praktik|practice|arsitektur|architecture)/.test(c)) return 2;
  return 1;
}

/** Last resort when the AI gave no usable relation at all: layer by category, then by length. */
function inferEdges(nodes: CurriculumNode[]): [string, string][] {
  const ordered = nodes
    .map((n, i) => ({ n, i, t: tier(n.category) }))
    .sort((a, b) => a.t - b.t || a.n.estimated_minutes - b.n.estimated_minutes || a.i - b.i);
  const layers = new Map<number, string[]>();
  for (const o of ordered) layers.set(o.t, [...(layers.get(o.t) ?? []), o.n.id]);
  const keys = [...layers.keys()].sort((a, b) => a - b);
  const out: [string, string][] = [];
  if (keys.length < 2) {
    const numCols = ordered.length <= 3 ? ordered.length : ordered.length <= 8 ? 3 : Math.min(Math.ceil(ordered.length / 3), 5);
    const cols: string[][] = [];
    const base = Math.floor(ordered.length / numCols);
    const rem = ordered.length % numCols;
    let start = 0;
    for (let c = 0; c < numCols; c++) {
      const take = base + (c < rem ? 1 : 0);
      if (take > 0) {
        cols.push(ordered.slice(start, start + take).map((o) => o.n.id));
        start += take;
      }
    }
    for (let c = 1; c < cols.length; c++) {
      const prev = cols[c - 1];
      const cur = cols[c];
      cur.forEach((id, i) => out.push([prev[i % prev.length], id]));
      prev.forEach((id, i) => { if (i >= cur.length) out.push([id, cur[i % cur.length]]); });
    }
    return out;
  }
  for (let k = 1; k < keys.length; k++) {
    const prev = layers.get(keys[k - 1])!;
    const cur = layers.get(keys[k])!;
    cur.forEach((id, i) => out.push([prev[i % prev.length], id]));
    // A prerequisite nobody picked up still has to lead somewhere.
    prev.forEach((id, i) => { if (i >= cur.length) out.push([id, cur[i % cur.length]]); });
  }
  return out;
}

export function normalizeGraph(
  rawNodes: unknown,
  rawEdges: unknown,
): { nodes: LeveledNode[]; edges: CurriculumEdge[]; inferredEdges?: boolean } {
  // 1. Nodes: keep the first of each (case-insensitive) id.
  const nodes: CurriculumNode[] = [];
  const used = new Set<string>();
  const byKey = new Map<string, string>(); // id / slug / label slug -> canonical id
  for (const r of Array.isArray(rawNodes) ? rawNodes : []) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Loose;
    const label = first(o, ['label', 'name', 'title', 'concept']);
    const id = first(o, ['id', 'node_id', 'key', 'slug']) || slug(label);
    if (!id) continue;
    if (used.has(id.toLowerCase())) continue;
    used.add(id.toLowerCase());
    const minutes = Number(o.estimated_minutes);
    const status = STATUSES.includes(String(o.status)) ? (o.status as CurriculumNode['status']) : 'ready';
    const node: CurriculumNode = {
      ...(o as Partial<CurriculumNode>),
      id,
      label: label || id,
      category: asStr(o.category),
      description: asStr(o.description),
      status,
      estimated_minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 30,
      is_gap: o.is_gap === true || o.is_gap === 'true' || status === 'prerequisite_gap',
    };
    nodes.push(node);
    for (const k of [id, id.toLowerCase(), slug(id), slug(node.label)]) if (k && !byKey.has(k)) byKey.set(k, id);
  }
  const resolve = (v: unknown): string | null => {
    const s = asStr(v);
    return s ? (byKey.get(s) ?? byKey.get(s.toLowerCase()) ?? byKey.get(slug(s)) ?? null) : null;
  };

  // 2. Candidate relations as [prerequisite, dependent]: edge objects first, then node.prerequisites.
  const pairs: [string, string, string | undefined][] = [];
  for (const r of Array.isArray(rawEdges) ? rawEdges : []) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Loose;
    const s = resolve(first(o, ['source', 'from', 'prerequisite', 'prereq', 'parent']));
    const t = resolve(first(o, ['target', 'to', 'dependent', 'child']));
    if (s && t) pairs.push([s, t, asStr(o.label) || undefined]);
  }
  for (const r of Array.isArray(rawNodes) ? rawNodes : []) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Loose;
    const self = resolve(first(o, ['id', 'node_id', 'key', 'slug']) || slug(first(o, ['label', 'name', 'title', 'concept'])));
    if (!self) continue;
    for (const k of ['prerequisites', 'prerequisite_ids', 'requires', 'depends_on', 'dependsOn']) {
      for (const p of toList(o[k])) {
        const s = resolve(p && typeof p === 'object' ? (p as Loose).id : p);
        if (s) pairs.push([s, self, undefined]);
      }
    }
  }

  // 3. Accept a pair only if it is new, not a self loop, and does not close a cycle.
  const children = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const reaches = (from: string, to: string) => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      if (n === to) return true;
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...(children.get(n) ?? []));
    }
    return false;
  };
  const edges: CurriculumEdge[] = [];
  const seenPair = new Set<string>();
  const accept = (s: string, t: string, label?: string) => {
    const key = `${s}\u0000${t}`;
    if (s === t || seenPair.has(key) || reaches(t, s)) return;
    seenPair.add(key);
    children.get(s)!.push(t);
    edges.push({ id: `e${edges.length + 1}`, source: s, target: t, ...(label ? { label } : {}) });
  };
  let inferred = false;
  for (const [s, t, l] of pairs) accept(s, t, l);
  if (edges.length === 0 && nodes.length > 1) {
    inferred = true;
    for (const [s, t] of inferEdges(nodes)) accept(s, t);
  }

  // 4. Levels by longest path from a root.
  const parents = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) parents.get(e.target)!.push(e.source);
  const level = new Map<string, number>();
  const depth = (id: string): number => {
    if (level.has(id)) return level.get(id)!;
    const d = Math.max(-1, ...parents.get(id)!.map(depth)) + 1;
    level.set(id, d);
    return d;
  };
  const result: { nodes: LeveledNode[]; edges: CurriculumEdge[]; inferredEdges?: boolean } = {
    nodes: nodes.map((n) => ({ ...n, level: depth(n.id) })),
    edges,
  };
  if (inferred) {
    result.inferredEdges = true;
  }
  return result;
}
