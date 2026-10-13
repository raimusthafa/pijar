import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Direct execution of Pure Graph Engine algorithms using Node.js TypeScript stripping
import {
  validateDAG,
  computeGraphSummary,
  inspectPrerequisiteChain,
  recommendNextConcept,
  buildAdjacencyMaps,
  getAllAncestors,
  getAllDescendants,
} from '../src/lib/graph/engine.ts';
import { prerequisitesWithin } from '../src/lib/graph/prereq.ts';

describe('PIJAR Knowledge Graph & Prerequisite Engine Test Suite', () => {
  const sampleNodes = [
    { id: 'math', label: 'Matematika Dasar', category: 'Dasar', description: 'Logika & Himpunan', status: 'completed', estimated_minutes: 30, is_gap: false },
    { id: 'algo-intro', label: 'Pengantar Algoritma', category: 'Dasar', description: 'Variabel & Percabangan', status: 'ready', estimated_minutes: 40, is_gap: false },
    { id: 'rekursi', label: 'Rekursi & Induksi', category: 'Lanjutan', description: 'Base case & recursive step', status: 'prerequisite_gap', estimated_minutes: 50, is_gap: true },
    { id: 'trees', label: 'Binary Search Tree', category: 'Struktur Data', description: 'Pohon Biner', status: 'locked', estimated_minutes: 60, is_gap: false },
  ];

  const sampleEdges = [
    { id: 'e1', source: 'math', target: 'rekursi', label: 'dasar induksi' },
    { id: 'e2', source: 'algo-intro', target: 'rekursi', label: 'kontrol alur' },
    { id: 'e3', source: 'rekursi', target: 'trees', label: 'traversal pohon' },
  ];

  test('Skenario 1: Validasi Normal DAG (Acyclic Directed Graph)', () => {
    const result = validateDAG(sampleNodes, sampleEdges);
    assert.equal(result.isValid, true, 'DAG normal harus valid');
    assert.equal(result.hasCycles, false, 'Tidak boleh ada siklus');
    assert.equal(result.errors.length, 0, 'Tidak boleh ada error');
  });

  test('Skenario 2: Deteksi Siklus (Cycle Detection via Kahn Algorithm)', () => {
    const cyclicEdges = [
      ...sampleEdges,
      { id: 'e-cycle', source: 'trees', target: 'rekursi', label: 'circular dependency' },
    ];
    const result = validateDAG(sampleNodes, cyclicEdges);
    assert.equal(result.isValid, false, 'Graf dengan siklus harus tidak valid');
    assert.equal(result.hasCycles, true, 'Harus mendeteksi keberadaan siklus');
    assert.ok(result.errors.some(e => e.includes('Siklus ketergantungan')));
  });

  test('Skenario 3: Deteksi Self-Loop (Node menuju dirinya sendiri)', () => {
    const loopEdges = [
      ...sampleEdges,
      { id: 'e-loop', source: 'rekursi', target: 'rekursi', label: 'self-loop' },
    ];
    const result = validateDAG(sampleNodes, loopEdges);
    assert.equal(result.isValid, false, 'Self-loop harus ditolak');
    assert.ok(result.errors.some(e => e.includes('Self-referencing loop')));
  });

  test('Skenario 4: Deteksi Duplikasi ID Node', () => {
    const duplicateNodes = [
      ...sampleNodes,
      { id: 'math', label: 'Matematika Duplikat', category: 'Dasar', description: 'Duplikat', status: 'locked', estimated_minutes: 10, is_gap: false },
    ];
    const result = validateDAG(duplicateNodes, sampleEdges);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Duplikasi ID node terdeteksi')));
  });

  test('Skenario 5: Deteksi Edge Merujuk ke Node Non-Existent', () => {
    const brokenEdges = [
      ...sampleEdges,
      { id: 'e-broken', source: 'non-existent-node', target: 'trees', label: 'invalid' },
    ];
    const result = validateDAG(sampleNodes, brokenEdges);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Edge merujuk ke source node yang tidak ada')));
  });

  test('Skenario 6: Traversal Rantai Prasyarat & Blokir (inspectPrerequisiteChain)', () => {
    const chainTrees = inspectPrerequisiteChain('trees', sampleNodes, sampleEdges);
    assert.equal(chainTrees.nodeId, 'trees');
    assert.deepEqual(chainTrees.directPrerequisites, ['rekursi']);
    assert.ok(chainTrees.allAncestors.includes('rekursi'));
    assert.ok(chainTrees.allAncestors.includes('math'));
    assert.ok(chainTrees.allAncestors.includes('algo-intro'));
    assert.equal(chainTrees.isBlocked, true, 'Trees harus terblokir karena rekursi belum tuntas');
  });

  test('Skenario 7a: Rekomendasi Prasyarat Pertama (algo-intro mendahului rekursi)', () => {
    // Karena algo-intro belum selesai, algo-intro harus direkomendasikan terlebih dahulu untuk membuka rekursi
    const rec1 = recommendNextConcept(sampleNodes, sampleEdges);
    assert.ok(rec1.recommendedNode);
    assert.equal(rec1.recommendedNode.id, 'algo-intro');
    assert.equal(rec1.category, 'ready_concept');
  });

  test('Skenario 7b: Rekomendasi Gap Terbuka (Rekursi diprioritaskan setelah algo-intro selesai)', () => {
    // Saat algo-intro telah dikuasai (completed), rekursi yang merupakan prerequisite_gap harus diprioritaskan
    const nodesWithAlgoDone = sampleNodes.map(n =>
      n.id === 'algo-intro' ? { ...n, status: 'completed' } : n
    );
    const rec2 = recommendNextConcept(nodesWithAlgoDone, sampleEdges);
    assert.ok(rec2.recommendedNode);
    assert.equal(rec2.recommendedNode.id, 'rekursi');
    assert.equal(rec2.category, 'critical_prerequisite_gap');
  });

  test('Skenario 8: Metrik Ringkasan Graf (computeGraphSummary)', () => {
    const summary = computeGraphSummary(sampleNodes);
    assert.equal(summary.totalConcepts, 4);
    assert.equal(summary.masteredCount, 1);
    assert.equal(summary.unresolvedGapsCount, 1);
    assert.equal(summary.readyCount, 1);
    assert.equal(summary.lockedCount, 1);
    assert.equal(summary.completionPercentage, 25);
    assert.equal(summary.estimatedTotalMinutes, 180);
  });

  test('Skenario 9: Peta Adjacency & Traversal Ancestor/Descendant', () => {
    const { prerequisitesMap, dependentsMap } = buildAdjacencyMaps(sampleNodes, sampleEdges);
    const directOfRekursi = prerequisitesMap.get('rekursi') || [];
    assert.deepEqual(directOfRekursi.sort(), ['algo-intro', 'math'].sort());

    const ancestorsOfTrees = getAllAncestors('trees', prerequisitesMap);
    assert.deepEqual(ancestorsOfTrees.sort(), ['algo-intro', 'math', 'rekursi'].sort());

    const descendantsOfMath = getAllDescendants('math', dependentsMap);
    assert.deepEqual(descendantsOfMath.sort(), ['rekursi', 'trees'].sort());
  });
  test('Skenario 10: prerequisitesWithin berhenti di dua level', () => {
    const edges = [
      { id: 'a', source: 'n1', target: 'n2' },
      { id: 'b', source: 'n2', target: 'n3' },
      { id: 'c', source: 'n3', target: 'n4' },
      { id: 'd', source: 'n0', target: 'n3' },
    ];
    const { level, edgeIds } = prerequisitesWithin('n4', edges);
    assert.deepEqual([...level].sort(), [['n0', 2], ['n2', 2], ['n3', 1]]);
    assert.deepEqual([...edgeIds].sort(), ['b', 'c', 'd']);
    assert.equal(prerequisitesWithin('n1', edges).level.size, 0);
    assert.equal(prerequisitesWithin('n4', edges, 3).level.get('n1'), 3);
  });
});
