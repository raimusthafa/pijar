import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateDiagnosticAnswers,
  sanitizeDAG,
  buildProceduralTopicDAG,
  analyzeLearnerIntake,
  buildProceduralIntakeFallback,
} from '../src/lib/diagnostic/engine.ts';

import { validateDAG } from '../src/lib/graph/engine.ts';
import { getBaselineCurriculum } from '../src/lib/graph/adapter.ts';

describe('PIJAR Zero-Mock Diagnostic & Dynamic DAG Curriculum Test Suite', () => {
  const sampleAnswers = [
    {
      question_id: 'q1',
      question: 'Apa perbedaan mendasar antara thread dan coroutine?',
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      selected_option: 0,
      correct_index: 0,
      confidence_level: 'high',
      concept_tested: 'Thread vs Coroutine',
      target_node_id: 'coroutine-basics',
    },
    {
      question_id: 'q2',
      question: 'Bagaimana cara mencegah race condition pada shared state?',
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      selected_option: 1, // Wrong
      correct_index: 0,
      confidence_level: 'high', // Severe Misconception!
      concept_tested: 'Mutex & Concurrency Locks',
      target_node_id: 'concurrency-locks',
    },
    {
      question_id: 'q3',
      question: 'Kapan dead lock dapat terjadi dalam sinkronisasi proses?',
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      selected_option: 2, // Wrong
      correct_index: 1,
      confidence_level: 'low', // Regular gap / unlearned
      concept_tested: 'Deadlock Detection',
      target_node_id: 'deadlock-detection',
    },
    {
      question_id: 'q4',
      question: 'Apa peran atomic operation dalam memori CPU?',
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      selected_option: 0, // Correct
      correct_index: 0,
      confidence_level: 'low', // Fragile knowledge!
      concept_tested: 'Atomic Primitives',
      target_node_id: 'atomic-primitives',
    },
    {
      question_id: 'q5',
      question: 'Mengapa event-driven architecture lebih efisien untuk I/O bound?',
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      selected_option: 2, // Correct
      correct_index: 2,
      confidence_level: 'medium', // Solid mastery
      concept_tested: 'Event Driven I/O',
      target_node_id: 'event-driven-io',
    },
  ];

  test('Skenario 1: Evaluasi Metakognisi & Matriks Keyakinan (Confidence Matrix)', () => {
    const result = evaluateDiagnosticAnswers(sampleAnswers);

    assert.equal(result.total, 5, 'Total soal harus 5');
    assert.equal(result.correctCount, 3, 'Jawaban benar harus 3 (q1, q4, q5)');

    // Check Metacognitive Matrix
    assert.equal(result.confidenceMatrix.misconceptions, 1, 'q2 salah dengan keyakinan tinggi harus dihitung 1 miskonsepsi kritis');
    assert.equal(result.confidenceMatrix.regular_gaps, 1, 'q3 salah dengan keyakinan rendah harus dihitung 1 regular gap');
    assert.equal(result.confidenceMatrix.fragile, 1, 'q4 benar dengan keyakinan rendah harus dihitung 1 pengetahuan rapuh');
    assert.equal(result.confidenceMatrix.solid, 2, 'q1 & q5 benar dengan keyakinan sedang/tinggi harus dihitung 2 penguasaan kokoh');
  });

  test('Skenario 2: Identifikasi Gap & Penetapan Tingkat Keparahan (Severity)', () => {
    const result = evaluateDiagnosticAnswers(sampleAnswers);

    const criticalGap = result.derivedGaps.find(g => g.concept === 'Mutex & Concurrency Locks');
    assert.ok(criticalGap, 'Miskonsepsi harus terdaftar dalam derivedGaps');
    assert.equal(criticalGap.severity, 'critical', 'Miskonsepsi aktif harus berstatus critical');
    assert.ok(criticalGap.justification.includes('miskonsepsi aktif'));

    const regularGap = result.derivedGaps.find(g => g.concept === 'Deadlock Detection');
    assert.ok(regularGap, 'Gap reguler harus terdaftar');
    assert.equal(regularGap.severity, 'moderate', 'Gap belum dipelajari harus berstatus moderate');

    const fragileGap = result.derivedGaps.find(g => g.concept === 'Atomic Primitives');
    assert.ok(fragileGap, 'Pengetahuan rapuh harus terdaftar');
    assert.equal(fragileGap.severity, 'minor', 'Pengetahuan rapuh harus berstatus minor');
  });

  test('Skenario 3: Sanitasi Graf & Pemangkasan Siklus (Kahn DAG Sanitizer)', () => {
    const rawNodes = [
      { id: 'node-a', label: 'Konsep A', category: 'Dasar', description: 'Desc A', status: 'completed', estimated_minutes: 20, is_gap: false },
      { id: 'node-b', label: 'Konsep B', category: 'Inti', description: 'Desc B', status: 'ready', estimated_minutes: 30, is_gap: false },
      { id: 'node-c', label: 'Konsep C', category: 'Mahir', description: 'Desc C', status: 'locked', estimated_minutes: 40, is_gap: false },
      { id: 'node-a', label: 'Konsep A Duplikat', category: 'Dasar', description: 'Duplikat', status: 'ready', estimated_minutes: 20, is_gap: false },
    ];

    const rawEdgesWithCycle = [
      { id: 'e1', source: 'node-a', target: 'node-b', label: 'relasi 1' },
      { id: 'e2', source: 'node-b', target: 'node-c', label: 'relasi 2' },
      { id: 'e-loop', source: 'node-b', target: 'node-b', label: 'self-loop' },
      { id: 'e-cycle', source: 'node-c', target: 'node-a', label: 'circular dependency' }, // Siklus!
    ];

    const sanitized = sanitizeDAG(rawNodes, rawEdgesWithCycle);

    // Node duplikat harus dibersihkan
    assert.equal(sanitized.nodes.length, 3, 'Duplikasi node harus dibuang');

    // Self-loop dan siklus melingkar harus dipangkas
    const validation = validateDAG(sanitized.nodes, sanitized.edges);
    assert.equal(validation.isValid, true, 'Graf hasil sanitasi harus valid DAG');
    assert.equal(validation.hasCycles, false, 'Graf tidak boleh memiliki siklus');
    assert.ok(!sanitized.edges.some(e => e.source === 'node-c' && e.target === 'node-a'), 'Back-edge siklus harus dibuang');
  });

  test('Skenario 4: Sintesis Kurikulum Prosedural untuk Topik Arbitrer Bebas (Zero Mock DSA)', () => {
    const customTopic = 'Rust Memory Safety & Borrow Checker';
    const evalResult = evaluateDiagnosticAnswers(sampleAnswers);

    const generated = buildProceduralTopicDAG(customTopic, 'Persiapan Interview', evalResult);

    assert.ok(generated.nodes.length >= 5, 'Harus menghasilkan minimal 5 node kurikulum');
    assert.ok(generated.edges.length >= 4, 'Harus menghasilkan edges ketergantungan');

    // Validasi DAG
    const validation = validateDAG(generated.nodes, generated.edges);
    assert.equal(validation.isValid, true, 'Kurikulum yang disintesis harus valid DAG');
    assert.equal(validation.hasCycles, false, 'Tidak boleh ada siklus');

    // Pastikan tidak ada kebocoran mock DSA
    const hasDsaLeak = generated.nodes.some(n => n.id === 'array' || n.id === 'stack' || n.id === 'binary-search');
    assert.equal(hasDsaLeak, false, 'Kurikulum untuk topik Rust TIDAK BOLEH mengandung node mock DSA');

    // Pastikan node memiliki koordinat layout
    for (const node of generated.nodes) {
      assert.ok(typeof node.x === 'number', 'Node harus memiliki koordinat x');
      assert.ok(typeof node.y === 'number', 'Node harus memiliki koordinat y');
    }
  });

  test('Skenario 5: Adapter Baseline Mendukung Topik Kustom Dinamis', () => {
    const result = getBaselineCurriculum('Kubernetes Microservices');
    assert.equal(result.topicName, 'Kubernetes Microservices');
    assert.ok(result.nodes.length >= 4);

    const validation = validateDAG(result.nodes, result.edges);
    assert.equal(validation.isValid, true, 'Baseline kustom harus valid DAG');

    // Tidak boleh jatuh ke mock DSA
    const hasDsaLeak = result.nodes.some(n => n.id === 'array' || n.id === 'binary-search');
    assert.equal(hasDsaLeak, false, 'Topik Kubernetes tidak boleh fallback ke mock DSA');
  });

  test('Skenario 6: Ekstraksi Keluh Kesah Belajar & Empati (Beginner Venting)', async () => {
    const rawVenting = 'saya ingin belajar tentang cyber security, namun aku bingung harus mulai darimana karena aku tidak punya sumber belajar yang cukup';

    // Test procedural cognitive fallback parser
    const intake = buildProceduralIntakeFallback(rawVenting);

    assert.ok(intake.canonical_topic.includes('Cybersecurity'), 'Topik harus diekstrak sebagai Cybersecurity');
    assert.equal(intake.detected_level, 'absolute_beginner', 'Siswa yang bingung harus dideteksi sebagai absolute beginner');
    assert.equal(intake.target_ambition, 'foundational_clarity', 'Target ambisi harus klarifikasi fondasi');
    assert.equal(intake.is_practitioner_track, false, 'Bukan jalur praktisi');

    // Cek keluh kesah yang diekstrak
    assert.ok(
      intake.pain_points.some(p => p.includes('Roadmap Paralysis') || p.includes('Titik Awal')),
      'Harus mendeteksi kebingungan titik awal (Roadmap Paralysis)'
    );
    assert.ok(
      intake.pain_points.some(p => p.includes('Sumber Belajar') || p.includes('Keterbatasan')),
      'Harus mendeteksi masalah keterbatasan sumber belajar'
    );

    // Cek catatan empati
    assert.ok(intake.empathy_mentor_note.length > 20, 'Harus memiliki catatan empati mentor yang memvalidasi kecemasan siswa');
    assert.ok(
      intake.empathy_mentor_note.toLowerCase().includes('bingung') ||
      intake.empathy_mentor_note.toLowerCase().includes('wajar'),
      'Catatan empati harus menenangkan dan memvalidasi kebingungan'
    );
  });

  test('Skenario 7: Eskalasi Jalur Praktisi Mahir & Kurikulum Arsitektur Industri', () => {
    const rawPractitionerInput = 'saya ingin belajar cyber security dan menjadi praktisi yang mahir di industri dengan menguasai arsitektur dan threat modeling mendalam';

    const intake = buildProceduralIntakeFallback(rawPractitionerInput);

    assert.equal(intake.is_practitioner_track, true, 'Harus mendeteksi ambisi praktisi mahir');
    assert.equal(intake.detected_level, 'advanced_practitioner', 'Tingkat harus terdeteksi advanced practitioner');
    assert.equal(intake.target_ambition, 'master_practitioner', 'Target ambisi harus master practitioner');
    assert.ok(intake.canonical_topic.includes('Praktisi Mahir'), 'Label topik harus mengindikasikan jalur praktisi mahir');

    // Test procedural DAG synthesis dengan isPractitionerTrack = true
    const evalResult = evaluateDiagnosticAnswers(sampleAnswers);
    const generatedDAG = buildProceduralTopicDAG('Cybersecurity', 'Spesialis Praktisi Mahir', evalResult, true);

    const validation = validateDAG(generatedDAG.nodes, generatedDAG.edges);
    assert.equal(validation.isValid, true, 'Graf kurikulum praktisi harus valid DAG');
    assert.equal(validation.hasCycles, false, 'Graf kurikulum praktisi tidak boleh memiliki siklus');

    // Harus mengandung kategori tingkat lanjut/arsitektur
    const hasArchitecture = generatedDAG.nodes.some(n => n.category === 'Arsitektur' || n.category === 'Penerapan Produksi');
    assert.equal(hasArchitecture, true, 'Kurikulum praktisi harus memuat node Arsitektur dan Penerapan Produksi');

    // Verifikasi label node yang dikalibrasi untuk praktisi
    const hasPractitionerNode = generatedDAG.nodes.some(n =>
      n.label.includes('Threat Model') ||
      n.label.includes('Internal Engine') ||
      n.label.includes('Hardening') ||
      n.label.includes('Edge-Case')
    );
    assert.equal(hasPractitionerNode, true, 'Kurikulum harus memuat topik praktisi seperti Threat Model / Hardening');
  });
});
