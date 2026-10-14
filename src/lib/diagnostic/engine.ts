// ================================================================
// PIJAR - Dynamic Diagnostic & Zero-Mock Curriculum Generator
// Core domain engine for real-time assessment & DAG curriculum synthesis
// ================================================================

import { generateStructuredJSON } from '../ai/provider.ts';
import { calculateHierarchicalLayout } from '../graph/layout.ts';
import { normalizeGraph } from '../graph/normalize.ts';
import type {
  DiagnosticQuestion,
  DiagnosticAnswer,
  DiagnosticResult,
  KnowledgeGap,
  ConfidenceMatrix,
  CurriculumNode,
  CurriculumEdge,
  CognitiveIntakeResult,
  LearnerLevel,
  TargetAmbition,
} from '../../types/index.ts';
import type { EnrichedConceptNode } from '../graph/types.ts';

export interface EvaluatedAnswersResult {
  total: number;
  correctCount: number;
  confidenceMatrix: ConfidenceMatrix;
  evaluatedAnswers: (DiagnosticAnswer & { is_correct: boolean })[];
  derivedGaps: KnowledgeGap[];
}

/**
 * Deterministically evaluates user responses, factoring in metacognitive confidence levels.
 */
export function evaluateDiagnosticAnswers(
  answers: DiagnosticAnswer[]
): EvaluatedAnswersResult {
  let correctCount = 0;
  let misconceptions = 0;
  let regular_gaps = 0;
  let fragile = 0;
  let solid = 0;

  const evaluatedAnswers = answers.map((a) => {
    const isCorrect =
      typeof a.correct_index === 'number'
        ? a.selected_option === a.correct_index
        : false;

    if (isCorrect) {
      correctCount++;
      if (a.confidence_level === 'low') {
        fragile++;
      } else {
        solid++;
      }
    } else {
      if (a.confidence_level === 'high') {
        misconceptions++; // Highly confident in wrong answer = Root Misconception
      } else {
        regular_gaps++;
      }
    }

    return {
      ...a,
      is_correct: isCorrect,
    };
  });

  // Derive initial gaps from answers
  const derivedGaps: KnowledgeGap[] = [];
  const processedConcepts = new Set<string>();

  for (const ea of evaluatedAnswers) {
    if (!ea.is_correct) {
      const isMisconception = ea.confidence_level === 'high';
      const severity = isMisconception ? 'critical' : 'moderate';
      const conceptKey = ea.concept_tested.toLowerCase().trim();

      if (!processedConcepts.has(conceptKey)) {
        processedConcepts.add(conceptKey);
        derivedGaps.push({
          concept: ea.concept_tested,
          target_node_id: ea.target_node_id,
          severity,
          justification: isMisconception
            ? `Terdeteksi miskonsepsi aktif pada "${ea.concept_tested}" di mana pemahaman perlu diluruskan terlebih dahulu agar tidak menimbulkan kesalahan penalaran di konsep lanjutan.`
            : `Konsep "${ea.concept_tested}" belum dikuasai dengan tuntas dan menjadi prasyarat krusial untuk materi berikutnya.`,
          prerequisites: [ea.concept_tested],
        });
      }
    } else if (ea.confidence_level === 'low') {
      const conceptKey = ea.concept_tested.toLowerCase().trim();
      if (!processedConcepts.has(conceptKey)) {
        processedConcepts.add(conceptKey);
        derivedGaps.push({
          concept: ea.concept_tested,
          target_node_id: ea.target_node_id,
          severity: 'minor',
          justification: `Jawaban pada "${ea.concept_tested}" sudah benar, namun tingkat keyakinan masih rendah (pengetahuan rapuh). Disarankan untuk memperkuat konsep dasar ini.`,
          prerequisites: [ea.concept_tested],
        });
      }
    }
  }

  return {
    total: answers.length,
    correctCount,
    confidenceMatrix: {
      misconceptions,
      regular_gaps,
      fragile,
      solid,
    },
    evaluatedAnswers,
    derivedGaps,
  };
}

/**
 * Procedural Cognitive Intake Fallback: parses text, pain points, and practitioner ambitions.
 */
export function buildProceduralIntakeFallback(text: string): CognitiveIntakeResult {
  const lower = (text || '').toLowerCase();
  let canonical_topic = 'Teknologi & Komputasi';
  let domain_category = 'Ilmu Komputer';

  // Topic detection
  if (lower.includes('cyber') || lower.includes('security') || lower.includes('keamanan') || lower.includes('hacker') || lower.includes('pentest') || lower.includes('infosec')) {
    canonical_topic = 'Cybersecurity';
    domain_category = 'Keamanan Informasi & Jaringan';
  } else if (lower.includes('ml') || lower.includes('machine learning') || lower.includes('ai') || lower.includes('artificial') || lower.includes('deep learning')) {
    canonical_topic = 'Machine Learning & AI';
    domain_category = 'Kecerdasan Buatan';
  } else if (lower.includes('web') || lower.includes('frontend') || lower.includes('react') || lower.includes('next') || lower.includes('fullstack')) {
    canonical_topic = 'Web & Fullstack Development';
    domain_category = 'Pengembangan Web Modern';
  } else if (lower.includes('docker') || lower.includes('devops') || lower.includes('kubernetes') || lower.includes('cloud') || lower.includes('terraform')) {
    canonical_topic = 'DevOps & Cloud Systems';
    domain_category = 'Infrastruktur Cloud & DevOps';
  } else if (lower.includes('data') && lower.includes('base') || lower.includes('sql') || lower.includes('postgres')) {
    canonical_topic = 'Database & SQL Architecture';
    domain_category = 'Arsitektur Data & Basis Data';
  } else if (text.trim().length > 0 && text.trim().length <= 50 && !text.includes('\n')) {
    canonical_topic = text.trim();
  }

  // Ambition / practitioner detection
  const isPractitioner = lower.includes('praktisi') || lower.includes('mahir') || lower.includes('advanced') || lower.includes('industri') || lower.includes('deep dive') || lower.includes('spesialis');
  const isBeginnerConfused = lower.includes('bingung') || lower.includes('mulai darimana') || lower.includes('sumber') || lower.includes('nol') || lower.includes('dasar') || lower.includes('pemula');

  const detected_level: LearnerLevel = isPractitioner
    ? 'advanced_practitioner'
    : isBeginnerConfused
    ? 'absolute_beginner'
    : 'intermediate';

  const target_ambition: TargetAmbition = isPractitioner
    ? 'master_practitioner'
    : isBeginnerConfused
    ? 'foundational_clarity'
    : 'career_ready';

  // Extract pain points
  const pain_points: string[] = [];
  if (lower.includes('bingung') || lower.includes('mulai darimana')) {
    pain_points.push('Roadmap Paralysis (Kebingungan Menentukan Titik Awal)');
  }
  if (lower.includes('sumber') || lower.includes('materi') || lower.includes('referensi') || lower.includes('kurang')) {
    pain_points.push('Keterbatasan Sumber Belajar Terkurasi');
  }
  if (isPractitioner) {
    pain_points.push('Kebutuhan Standar Praktisi Industri & Studi Kasus Mendalam');
  }
  if (pain_points.length === 0) {
    pain_points.push('Kebutuhan Struktur Belajar Terarah & Terukur');
  }

  const topicDisplay = isPractitioner ? `${canonical_topic} (Jalur Praktisi Mahir)` : canonical_topic;

  const empathy_mentor_note = isPractitioner
    ? `Ambisi yang luar biasa! Untuk menjadi praktisi yang mahir di bidang ${canonical_topic}, kamu membutuhkan lebih dari sekadar teori dasar. Pijar telah mengkalibrasi kurikulum dan studi kasus arsitektural yang menantang standar industri.`
    : `Sangat wajar merasa bingung ketika memulai ${canonical_topic} karena materinya sering kali berserakan tanpa peta jalan yang jelas. Di Pijar, kamu tidak perlu mencari-cari sumber luar lagi. Kami telah mengurasi alur belajar langkah demi langkah dari fondasi paling awal.`;

  return {
    raw_input: text,
    canonical_topic: topicDisplay,
    domain_category,
    detected_level,
    target_ambition,
    is_practitioner_track: isPractitioner,
    pain_points,
    empathy_mentor_note,
    recommended_diagnostic_focus: isPractitioner
      ? ['Arsitektur Sistem & Trade-off', 'Analisis Skenario Edge Cases', 'Standar Praktik Industri']
      : ['Model Mental & Filosofi Dasar', 'Terminologi Esensial', 'Konsep Prasyarat Gerbang'],
    target_goal: isPractitioner ? 'Spesialis Praktisi Mahir' : 'Membangun Fondasi Kokoh dari Nol',
    recommended_first_step: isPractitioner
      ? 'Fokus pada evaluasi pemodelan ancaman dan batasan arsitektural sebelum melangkah ke eksploitasi dan hardening sistem.'
      : 'Mulailah dengan modul model mental dasar untuk menyingkirkan kebingungan awal sebelum masuk ke materi teknis.',
  };
}

/**
 * Analyzes natural language input, including student complaints, anxiety, and ambitions.
 * Empathically filters canonical domain topics, extracts underlying blockers,
 * and determines whether to activate the Advanced Practitioner Track.
 */
export async function analyzeLearnerIntake(
  rawInput: string
): Promise<CognitiveIntakeResult> {
  const text = (rawInput || '').trim();
  if (!text) {
    return buildProceduralIntakeFallback('Struktur Data & Algoritma');
  }

  const prompt = `Analisis pernyataan atau keluh kesah belajar siswa berikut:
"${text}"

TUGAS AI (Cognitive Intake & Empathic Semantic Filtering):
1. Ekstrak nama topik kanonikal yang bersih dan formal ("canonical_topic", contoh: "Cybersecurity Fundamentals", "Cybersecurity (Jalur Praktisi Mahir)", "Rust Concurrency").
2. Tentukan kategori domain ilmu ("domain_category", contoh: "Keamanan Sistem & Informasi", "Rekayasa Perangkat Lunak").
3. Deteksi tingkat kemampuan awal ("detected_level": "absolute_beginner" | "intermediate" | "advanced_practitioner").
   - Jika siswa menyatakan bingung harus mulai darimana, belum punya dasar, atau butuh pengenalan -> "absolute_beginner".
   - Jika siswa secara eksplisit ingin menjadi praktisi yang mahir, ahli industri, mempelajari arsitektur dalam, atau studi kasus kompleks -> "advanced_practitioner".
4. Tentukan ambisi target ("target_ambition": "foundational_clarity" | "career_ready" | "master_practitioner").
5. Apakah siswa mengarah ke jalur praktisi mahir? ("is_practitioner_track": boolean).
6. Ekstrak daftar keluh kesah, hambatan, atau kendala ("pain_points", contoh: ["Roadmap Paralysis", "Keterbatasan Sumber Belajar", "Kecemasan Istilah Teknis"]).
7. Tuliskan "empathy_mentor_note": Catatan empati dari AI mentor Pijar (2-3 kalimat) yang menenangkan, memvalidasi perasaannya, dan meyakinkan bahwa kurikulum Pijar akan memandunya secara terstruktur tanpa perlu pusing mencari sumber luar.
8. Buat "recommended_diagnostic_focus": 3-4 konsep kunci yang perlu diuji pada pre-test asesmen ini.
9. Buat "target_goal": Ringkasan tujuan pembelajaran.

Format JSON:
{
  "canonical_topic": "...",
  "domain_category": "...",
  "detected_level": "absolute_beginner",
  "target_ambition": "foundational_clarity",
  "is_practitioner_track": false,
  "pain_points": ["..."],
  "empathy_mentor_note": "...",
  "recommended_diagnostic_focus": ["..."],
  "target_goal": "..."
}`;

  const systemInstruction = `Kamu adalah Chief Learning Counselor dan Empathic Educational Psychologist di Pijar. Kamu ahli dalam mendengarkan keluh kesah pelajar, memvalidasi kecemasan belajar mereka, dan mengubahnya menjadi rencana pembelajaran yang jelas. Kembalikan HANYA JSON valid.`;

  try {
    const aiResult = await generateStructuredJSON<Omit<CognitiveIntakeResult, 'raw_input'>>(
      prompt,
      systemInstruction
    );

    if (aiResult?.canonical_topic) {
      return {
        raw_input: text,
        canonical_topic: aiResult.canonical_topic,
        domain_category: aiResult.domain_category || 'Teknologi Informasi & Komputer',
        detected_level: aiResult.detected_level || 'absolute_beginner',
        target_ambition: aiResult.target_ambition || 'foundational_clarity',
        is_practitioner_track: Boolean(aiResult.is_practitioner_track),
        pain_points: Array.isArray(aiResult.pain_points) ? aiResult.pain_points : ['Roadmap Paralysis'],
        empathy_mentor_note: aiResult.empathy_mentor_note || 'Sangat wajar merasa bingung di awal. Pijar telah menyusun panduan terarah untukmu.',
        recommended_diagnostic_focus: Array.isArray(aiResult.recommended_diagnostic_focus) ? aiResult.recommended_diagnostic_focus : [],
        target_goal: aiResult.target_goal || 'Pemahaman Fondasi Terstruktur',
      };
    }
  } catch (err) {
    console.warn('AI intake analysis failed, using procedural cognitive parser fallback:', err);
  }

  return buildProceduralIntakeFallback(text);
}

/**
 * Procedurally sanitizes and guarantees a strictly cycle-free DAG.
 * If Kahn's algorithm detects cycles in AI-generated edges, back-edges are pruned.
 */
export function sanitizeDAG(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
): { nodes: CurriculumNode[]; edges: CurriculumEdge[] } {
  return normalizeGraph(nodes, edges);
}

/**
 * Dynamically generates a tailored Knowledge Graph DAG for ANY given topic & diagnostic evaluation.
 */
export async function generateCurriculumGraph(params: {
  topic: string;
  targetGoal: string;
  evaluatedResult: EvaluatedAnswersResult;
  isPractitionerTrack?: boolean;
}): Promise<{ nodes: EnrichedConceptNode[]; edges: CurriculumEdge[] }> {
  const { topic, targetGoal, evaluatedResult, isPractitionerTrack = false } = params;
  const gapsSummary = evaluatedResult.derivedGaps
    .map(g => `- ${g.concept} (${g.severity}): ${g.justification}`)
    .join('\n');

  const practitionerGuidance = isPractitionerTrack
    ? `\nPERHATIAN KHUSUS JALUR PRAKTISI MAHIR: Siswa menargetkan tingkat praktisi industri. Buat konsep kurikulum yang menantang dan mendalam (arsitektur tingkat lanjut, edge cases produksi, dan hardening/optimasi skala besar).`
    : '';

  const prompt = `Buatkan kurikulum Knowledge Graph terstruktur dalam bentuk Directed Acyclic Graph (DAG) untuk topik: "${topic}".
Target Tujuan Pelajar: "${targetGoal}".${practitionerGuidance}
Hasil Evaluasi Diagnostik Siswa:
Total Soal: ${evaluatedResult.total}, Benar: ${evaluatedResult.correctCount}.
Kesenjangan Pengetahuan (Gaps & Miskonsepsi) yang terdeteksi:
${gapsSummary || 'Tidak ada gap kritis, siswa menjawab dengan pemahaman tinggi.'}

Ketentuan Struktur Kurikulum:
0. Setiap node WAJIB punya "prerequisites": array id node lain yang harus dikuasai lebih dulu ([] untuk konsep paling awal), dan setiap "source"/"target" pada edges HARUS persis sama dengan salah satu "id" node.
1. Buat antara 8 hingga 12 konsep (nodes) yang membentuk jalur pembelajaran runtut dari Fondasi, Konsep Inti, hingga Penerapan Mahir.
2. Setiap node memiliki:
   - "id": slug unik huruf kecil (contoh: "dasar-sintaks", "arsitektur-komponen")
   - "label": nama konsep ringkas dan jelas
   - "category": kategori lapisan kurikulum (contoh: "Fondasi", "Arsitektur", "Penerapan", "Lanjutan")
   - "description": penjelasan 1-2 kalimat tentang apa yang dipelajari
   - "status": 
     * Berikan status "prerequisite_gap" dan "is_gap": true pada node yang teridentifikasi dalam kesenjangan pengetahuan di atas.
     * Berikan status "completed" pada konsep paling awal/dasar yang telah dikuasai siswa.
     * Berikan status "ready" pada konsep yang prasyaratnya sudah selesai atau dapat dipelajari saat ini.
     * Berikan status "locked" pada konsep tingkat lanjut yang masih membutuhkan prasyarat.
   - "estimated_minutes": estimasi durasi belajar menit (20-60)
3. Buat relasi prasyarat (edges) di mana "source" adalah konsep prasyarat (yang harus dipelajari lebih dulu) dan "target" adalah konsep penerapannya.
4. JANGAN MEMBUAT SIKLUS (harus DAG valid tanpa perulangan melingkar).

Format JSON wajib:
{
  "nodes": [
    {
      "id": "slug-id",
      "label": "Nama Konsep",
      "category": "Kategori",
      "description": "Deskripsi singkat...",
      "status": "ready",
      "estimated_minutes": 30,
      "is_gap": false,
      "prerequisites": ["id-konsep-prasyarat"]
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "slug-prasyarat",
      "target": "slug-tujuan",
      "label": "keterkaitan konsep"
    }
  ]
}`;

  const systemInstruction = `Kamu adalah Chief Curriculum Architect di Pijar. Kamu ahli dalam mendesain hierarki konsep ilmu pengetahuan (Knowledge Graph) berbasis pedagogi mastery-based learning. Selalu kembalikan HANYA JSON valid.`;

  try {
    const aiData = await generateStructuredJSON<{
      nodes: CurriculumNode[];
      edges: CurriculumEdge[];
    }>(prompt, systemInstruction);

    if (aiData?.nodes && Array.isArray(aiData.nodes) && aiData.nodes.length >= 4) {
      const sanitized = sanitizeDAG(aiData.nodes, aiData.edges || []);
      const enriched = calculateHierarchicalLayout(sanitized.nodes, sanitized.edges);
      return {
        nodes: enriched,
        edges: sanitized.edges,
      };
    }
  } catch (err) {
    console.warn('AI Dynamic Graph generation failed, synthesizing procedural DAG:', err);
  }

  // Resilient Topic-Synthesized DAG Fallback (Zero hardcoded mock DSA!)
  return buildProceduralTopicDAG(topic, targetGoal, evaluatedResult, isPractitionerTrack);
}

/**
 * Procedural Fallback to synthesize a valid topic-aware DAG when AI provider is unreachable.
 * Dynamically incorporates student's specific gaps instead of falling back to static DSA mock.
 */
export function buildProceduralTopicDAG(
  topic: string,
  targetGoal: string,
  evaluatedResult: EvaluatedAnswersResult,
  isPractitionerTrack: boolean = false
): { nodes: EnrichedConceptNode[]; edges: CurriculumEdge[] } {
  const cleanTopic = topic.trim();
  const slugBase = cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Build nodes around the user's topic and detected gaps
  const gapConcepts = evaluatedResult.derivedGaps.map(g => g.concept);

  const rawNodes: CurriculumNode[] = isPractitionerTrack
    ? [
        {
          id: `${slugBase}-foundations`,
          label: `Prinsip Arsitektur Dasar & Threat Model`,
          category: 'Arsitektur',
          description: `Analisis model ancaman, boundary sistem, dan asumsi dasar desain ${cleanTopic}.`,
          status: evaluatedResult.correctCount > 0 ? 'completed' : 'ready',
          estimated_minutes: 30,
          is_gap: false,
        },
        ...gapConcepts.slice(0, 3).map((gc, idx) => ({
          id: `${slugBase}-gap-${idx + 1}`,
          label: gc,
          category: 'Kesenjangan Prasyarat Kritis',
          description: `Materi esensial yang terdeteksi sebagai miskonsepsi pada asesmen praktisi.`,
          status: 'prerequisite_gap' as const,
          estimated_minutes: 40,
          is_gap: true,
        })),
        {
          id: `${slugBase}-internal-mechanics`,
          label: `Mekanisme Eksekusi & Internal Engine`,
          category: 'Mekanika Inti',
          description: `Aliran data tingkat rendah, state machine, dan protokol operasional ${cleanTopic}.`,
          status: gapConcepts.length > 0 ? 'locked' : 'ready',
          estimated_minutes: 50,
          is_gap: false,
        },
        {
          id: `${slugBase}-industry-hardening`,
          label: `Penerapan Industri & System Hardening`,
          category: 'Penerapan Produksi',
          description: `Standar implementasi enterprise, mitigasi kegagalan, dan ketahanan produksi sesuai target ${targetGoal}.`,
          status: 'locked',
          estimated_minutes: 55,
          is_gap: false,
        },
        {
          id: `${slugBase}-edge-case-engineering`,
          label: `Skenario Ekstrem & Edge-Case Engineering`,
          category: 'Spesialisasi Mahir',
          description: `Eksplorasi skenario batas, eksploitasi, dan troubleshooting sistem kritis pada ${cleanTopic}.`,
          status: 'locked',
          estimated_minutes: 70,
          is_gap: false,
        },
      ]
    : [
        {
          id: `${slugBase}-foundation`,
          label: `Fondasi & Prinsip ${cleanTopic}`,
          category: 'Fondasi',
          description: `Pemahaman model mental dasar, terminologi esensial, dan latar belakang ${cleanTopic}.`,
          status: evaluatedResult.correctCount > 0 ? 'completed' : 'ready',
          estimated_minutes: 25,
          is_gap: false,
        },
        ...gapConcepts.slice(0, 3).map((gc, idx) => ({
          id: `${slugBase}-gap-${idx + 1}`,
          label: gc,
          category: 'Konsep Prasyarat Kritis',
          description: `Materi esensial yang terdeteksi sebagai kesenjangan belajar pada evaluasi diagnostik.`,
          status: 'prerequisite_gap' as const,
          estimated_minutes: 35,
          is_gap: true,
        })),
        {
          id: `${slugBase}-core-architecture`,
          label: `Arsitektur & Mekanisme ${cleanTopic}`,
          category: 'Konsep Inti',
          description: `Cara kerja mendalam, aliran data, dan interaksi komponen dalam ${cleanTopic}.`,
          status: gapConcepts.length > 0 ? 'locked' : 'ready',
          estimated_minutes: 45,
          is_gap: false,
        },
        {
          id: `${slugBase}-practical-implementation`,
          label: `Penerapan Praktis & Best Practices`,
          category: 'Penerapan',
          description: `Studi kasus nyata, optimasi, dan implementasi langsung sesuai target ${targetGoal}.`,
          status: 'locked',
          estimated_minutes: 50,
          is_gap: false,
        },
        {
          id: `${slugBase}-advanced-synthesis`,
          label: `Sintesis Mahir & Pemecahan Masalah Kompleks`,
          category: 'Lanjutan',
          description: `Eksplorasi skenario batas (edge cases) dan penyelesaian persoalan tingkat lanjut di bidang ${cleanTopic}.`,
          status: 'locked',
          estimated_minutes: 60,
          is_gap: false,
        },
      ];

  // Construct edges: Foundation -> Gaps -> Core -> Practical -> Advanced
  const rawEdges: CurriculumEdge[] = [];
  const foundationId = `${slugBase}-foundation`;
  const coreId = `${slugBase}-core-architecture`;
  const practicalId = `${slugBase}-practical-implementation`;
  const advancedId = `${slugBase}-advanced-synthesis`;

  if (gapConcepts.length > 0) {
    gapConcepts.slice(0, 3).forEach((_, idx) => {
      const gapId = `${slugBase}-gap-${idx + 1}`;
      rawEdges.push({
        id: `e-f-g${idx}`,
        source: foundationId,
        target: gapId,
        label: 'fondasi prasyarat',
      });
      rawEdges.push({
        id: `e-g-c${idx}`,
        source: gapId,
        target: coreId,
        label: 'prasyarat pemahaman inti',
      });
    });
  } else {
    rawEdges.push({
      id: 'e-f-c',
      source: foundationId,
      target: coreId,
      label: 'alur fondasi ke inti',
    });
  }

  rawEdges.push({
    id: 'e-c-p',
    source: coreId,
    target: practicalId,
    label: 'implementasi konsep',
  });
  rawEdges.push({
    id: 'e-p-a',
    source: practicalId,
    target: advancedId,
    label: 'pendalaman mahir',
  });

  const sanitized = sanitizeDAG(rawNodes, rawEdges);
  const enriched = calculateHierarchicalLayout(sanitized.nodes, sanitized.edges);

  return {
    nodes: enriched,
    edges: sanitized.edges,
  };
}
