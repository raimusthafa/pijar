import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGraph } from '../src/lib/graph/normalize.ts';
import { calculateHierarchicalLayout } from '../src/lib/graph/layout.ts';
import { validateDAG } from '../src/lib/graph/engine.ts';

const n = (id, extra = {}) => ({ id, label: `Konsep ${id}`, category: 'Inti', description: 'd', status: 'ready', estimated_minutes: 30, is_gap: false, ...extra });

/** A valid result: unique ids, every endpoint exists, acyclic, layered into more than one column, every node connected. */
function check(raw, rawEdges, minLevels = 3) {
  const g = normalizeGraph(raw, rawEdges);
  assert.equal(new Set(g.nodes.map((x) => x.id)).size, g.nodes.length);
  const ids = new Set(g.nodes.map((x) => x.id));
  for (const e of g.edges) assert.ok(ids.has(e.source) && ids.has(e.target));
  assert.equal(validateDAG(g.nodes, g.edges).hasCycles, false);
  const placed = calculateHierarchicalLayout(g.nodes, g.edges);
  assert.ok(new Set(placed.map((p) => p.x)).size >= minLevels, 'several columns');
  const touched = new Set(g.edges.flatMap((e) => [e.source, e.target]));
  assert.ok(g.nodes.every((x) => touched.has(x.id)), 'no isolated node');
  assert.ok(g.nodes.every((x) => Number.isInteger(x.level)));
  return g;
}

test('edges missing, prerequisites present', () => {
  const g = check([n('a', { prerequisites: [] }), n('b', { prerequisites: ['a'] }), n('c', { prerequisites: ['a', 'b'] }), n('d', { prerequisites: ['c'] })], []);
  assert.deepEqual(g.nodes.map((x) => x.level), [0, 1, 2, 3]);
});

test('ids that differ in case and labels used as endpoints', () => {
  const g = check([n('Dasar'), n('Inti'), n('Lanjut')], [{ from: 'dasar', to: 'INTI' }, { source: 'Konsep Inti', target: 'lanjut' }]);
  assert.equal(g.edges.length, 2);
});

test('cycle is broken, self loop dropped', () => {
  const g = check([n('a'), n('b'), n('c')], [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'c', target: 'a' }, { source: 'b', target: 'b' }]);
  assert.equal(g.edges.length, 2);
});

test('duplicate ids keep the first', () => {
  const g = check([n('a'), n('A', { label: 'dup' }), n('b'), n('c')], [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }]);
  assert.equal(g.nodes.length, 3);
});

test('string and bad levels are recomputed, dangling edges dropped', () => {
  const g = check([n('a', { level: '3' }), n('b', { level: 'x' }), n('c', { level: null })], [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'zzz', target: 'c' }, { source: 'a', target: 'nope' }]);
  assert.deepEqual(g.nodes.map((x) => x.level), [0, 1, 2]);
  assert.equal(g.edges.length, 2);
});

test('no relation at all (the stored Turunan Trigonometri case) is layered by category', () => {
  const g = check([
    n('x1', { category: 'Fondasi' }), n('x2', { category: 'Fondasi' }), n('x3', { category: 'Inti' }),
    n('x4', { category: 'Penerapan' }), n('x5', { category: 'Lanjutan' }),
  ], undefined, 4);
  assert.equal(g.nodes.find((x) => x.id === 'x5').level, 3);
});

test('garbage input does not throw', () => {
  assert.deepEqual(normalizeGraph(null, 'x'), { nodes: [], edges: [] });
  assert.equal(normalizeGraph([null, 3, { label: 'Solo' }], [null]).nodes.length, 1);
});
