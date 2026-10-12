import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Direct execution of Pure Mastery & Scheduler Engine algorithms
import { computeMasteryMetrics } from '../src/lib/mastery/engine.ts';
import { generateStudySchedule } from '../src/lib/scheduler/engine.ts';

describe('PIJAR Mastery Tracking Engine (F8) Test Suite', () => {
  const sampleNodes = [
    { id: 'math', label: 'Matematika Dasar', category: 'Dasar', description: 'Logika & Himpunan', status: 'completed', estimated_minutes: 30, is_gap: false },
    { id: 'algo', label: 'Pengantar Algoritma', category: 'Dasar', description: 'Variabel & Percabangan', status: 'completed', estimated_minutes: 40, is_gap: false },
    { id: 'rekursi', label: 'Rekursi & Induksi', category: 'Algoritma', description: 'Base case & recursive step', status: 'prerequisite_gap', estimated_minutes: 50, is_gap: true },
    { id: 'trees', label: 'Binary Search Tree', category: 'Struktur Data', description: 'Pohon Biner', status: 'locked', estimated_minutes: 60, is_gap: false },
    { id: 'dp', label: 'Dynamic Programming', category: 'Algoritma', description: 'Memoization', status: 'locked', estimated_minutes: 75, is_gap: false },
  ];

  const sampleEdges = [
    { id: 'e1', source: 'math', target: 'rekursi', label: 'dasar induksi' },
    { id: 'e2', source: 'algo', target: 'rekursi', label: 'kontrol alur' },
    { id: 'e3', source: 'rekursi', target: 'trees', label: 'traversal pohon' },
    { id: 'e4', source: 'rekursi', target: 'dp', label: 'subproblem rekursif' },
  ];

  test('Skenario 1: Penanganan Graf Kosong (Zero Concepts)', () => {
    const metrics = computeMasteryMetrics([], []);
    assert.equal(metrics.totalConcepts, 0);
    assert.equal(metrics.completionPercentage, 0);
    assert.equal(metrics.categoryBreakdown.length, 0);
    assert.equal(metrics.bottlenecks.length, 0);
    assert.equal(metrics.recommendedNextNode, null);
  });

  test('Skenario 2: Kalkulasi Persentase Penguasaan & Hitungan Status', () => {
    const metrics = computeMasteryMetrics(sampleNodes, sampleEdges);
    assert.equal(metrics.totalConcepts, 5);
    assert.equal(metrics.completedConcepts, 2);
    assert.equal(metrics.lockedConcepts, 2);
    assert.equal(metrics.gapConcepts, 1);
    // 2 out of 5 = 40%
    assert.equal(metrics.completionPercentage, 40);
    assert.deepEqual(metrics.masteredNodeIds, ['math', 'algo']);
  });

  test('Skenario 3: Distribusi Kategori (Category Breakdown)', () => {
    const metrics = computeMasteryMetrics(sampleNodes, sampleEdges);
    
    // Categories: 'Dasar' (2 total, 2 completed -> 100%), 'Algoritma' (2 total, 0 completed -> 0%), 'Struktur Data' (1 total, 0 completed -> 0%)
    const dasarCat = metrics.categoryBreakdown.find(c => c.category === 'Dasar');
    assert.ok(dasarCat, 'Kategori Dasar harus ada');
    assert.equal(dasarCat.total, 2);
    assert.equal(dasarCat.completed, 2);
    assert.equal(dasarCat.percentage, 100);

    const algoCat = metrics.categoryBreakdown.find(c => c.category === 'Algoritma');
    assert.ok(algoCat, 'Kategori Algoritma harus ada');
    assert.equal(algoCat.total, 2);
    assert.equal(algoCat.completed, 0);
    assert.equal(algoCat.percentage, 0);
  });

  test('Skenario 4: Deteksi Bottleneck Kurikulum (Blocked Downstream Nodes)', () => {
    const metrics = computeMasteryMetrics(sampleNodes, sampleEdges);
    
    // 'rekursi' memblokir 2 konsep: 'trees' dan 'dp'
    assert.ok(metrics.bottlenecks.length > 0, 'Harus mendeteksi setidaknya satu bottleneck');
    const topBottleneck = metrics.bottlenecks[0];
    assert.equal(topBottleneck.nodeId, 'rekursi');
    assert.equal(topBottleneck.blockedDownstreamCount, 2);
    assert.ok(topBottleneck.blockedDownstreamLabels.includes('Binary Search Tree'));
    assert.ok(topBottleneck.blockedDownstreamLabels.includes('Dynamic Programming'));
  });

  test('Skenario 5: Rekomendasi Konsep Selanjutnya (Prioritas Knowledge Gap)', () => {
    const metrics = computeMasteryMetrics(sampleNodes, sampleEdges);
    
    // Karena math & algo sudah selesai, rekursi (gap) siap diambil
    assert.ok(metrics.recommendedNextNode, 'Harus merekomendasikan konsep berikutnya');
    assert.equal(metrics.recommendedNextNode.id, 'rekursi');
    assert.ok(metrics.recommendationReason.includes('Akar Kesenjangan') || metrics.recommendationReason.includes('Prerequisite Gap'));
  });

  test('Skenario 6: Penanganan Kurikulum 100% Selesai', () => {
    const allCompletedNodes = sampleNodes.map(n => ({ ...n, status: 'completed' }));
    const metrics = computeMasteryMetrics(allCompletedNodes, sampleEdges);
    
    assert.equal(metrics.completionPercentage, 100);
    assert.equal(metrics.recommendedNextNode, null);
    assert.ok(metrics.recommendationReason.includes('Selamat'));
    assert.equal(metrics.bottlenecks.length, 0);
  });
});

describe('PIJAR Adaptive Learning Scheduler Engine (F9) Test Suite', () => {
  const sampleNodes = [
    { id: 'math', label: 'Matematika Dasar', category: 'Dasar', description: 'Logika & Himpunan', status: 'completed', estimated_minutes: 30, is_gap: false },
    { id: 'algo', label: 'Pengantar Algoritma', category: 'Dasar', description: 'Variabel & Percabangan', status: 'completed', estimated_minutes: 40, is_gap: false },
    { id: 'rekursi', label: 'Rekursi & Induksi', category: 'Algoritma', description: 'Base case & recursive step', status: 'prerequisite_gap', estimated_minutes: 30, is_gap: true },
    { id: 'trees', label: 'Binary Search Tree', category: 'Struktur Data', description: 'Pohon Biner', status: 'locked', estimated_minutes: 45, is_gap: false },
    { id: 'graphs', label: 'Graph Traversal', category: 'Struktur Data', description: 'BFS DFS', status: 'locked', estimated_minutes: 50, is_gap: false },
  ];

  const sampleEdges = [
    { id: 'e1', source: 'math', target: 'rekursi', label: 'dasar induksi' },
    { id: 'e2', source: 'algo', target: 'rekursi', label: 'kontrol alur' },
    { id: 'e3', source: 'rekursi', target: 'trees', label: 'traversal pohon' },
    { id: 'e4', source: 'trees', target: 'graphs', label: 'graf' },
  ];

  test('Skenario 1: Penanganan Input Kosong', () => {
    const plan = generateStudySchedule([], []);
    assert.equal(plan.items.length, 0);
    assert.equal(plan.totalPlannedMinutes, 0);
  });

  test('Skenario 2: Konsep Terkunci (Locked) TIDAK Boleh Dijadwalkan', () => {
    const plan = generateStudySchedule(sampleNodes, sampleEdges, 45);
    
    // 'trees' dan 'graphs' terkunci karena 'rekursi' belum selesai
    const scheduledNodeIds = plan.items.map(item => item.nodeId);
    assert.equal(scheduledNodeIds.includes('trees'), false, 'Locked node "trees" tidak boleh dijadwalkan');
    assert.equal(scheduledNodeIds.includes('graphs'), false, 'Locked node "graphs" tidak boleh dijadwalkan');
  });

  test('Skenario 3: Knowledge Gap yang Siap Diprioritaskan Paling Awal (High Priority)', () => {
    const plan = generateStudySchedule(sampleNodes, sampleEdges, 45);
    
    // 'rekursi' adalah gap dan semua prasyaratnya (math, algo) selesai
    assert.ok(plan.items.length > 0);
    const firstItem = plan.items[0];
    assert.equal(firstItem.nodeId, 'rekursi');
    assert.equal(firstItem.priority, 'high');
    assert.equal(firstItem.dayOffset, 0, 'Harus dijadwalkan hari ini (dayOffset = 0)');
  });

  test('Skenario 4: Review Spaced Repetition untuk Materi yang Sudah Selesai', () => {
    const plan = generateStudySchedule(sampleNodes, sampleEdges, 45);
    
    // Math / Algo sudah selesai, harus dijadwalkan sebagai review jika ada sisa slot
    const reviewItems = plan.items.filter(item => item.priority === 'review');
    assert.ok(reviewItems.length > 0, 'Harus ada review spaced repetition');
    assert.ok(['math', 'algo'].includes(reviewItems[0].nodeId));
  });

  test('Skenario 5: State Checkbox Penyelesaian Tugas (completedTasks)', () => {
    const completedSet = new Set(['sched-rekursi']);
    const plan = generateStudySchedule(sampleNodes, sampleEdges, 45, completedSet);
    
    const rekursiItem = plan.items.find(item => item.nodeId === 'rekursi');
    assert.ok(rekursiItem);
    assert.equal(rekursiItem.isCompleted, true, 'Task harus berstatus selesai jika ada di completedSet');
  });

  test('Skenario 6: Alokasi Waktu Harian (Daily Target Minutes)', () => {
    const plan30 = generateStudySchedule(sampleNodes, sampleEdges, 30);
    const plan60 = generateStudySchedule(sampleNodes, sampleEdges, 60);
    
    assert.equal(plan30.dailyTargetMinutes, 30);
    assert.equal(plan60.dailyTargetMinutes, 60);
    assert.ok(plan30.totalPlannedMinutes > 0);
    assert.ok(plan60.totalPlannedMinutes >= plan30.totalPlannedMinutes);
  });
});
