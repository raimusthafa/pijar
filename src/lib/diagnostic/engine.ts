// ================================================================
// PIJAR - Dynamic Diagnostic & Zero-Mock Curriculum Generator
// Core domain engine for real-time assessment & DAG curriculum synthesis
// ================================================================

import { generateStructuredJSON } from '../ai/provider.ts';
import { validateDAG, buildAdjacencyMaps } from '../graph/engine.ts';
import { calculateHierarchicalLayout } from '../graph/layout.ts';
import type {
  DiagnosticQuestion,
  DiagnosticAnswer,
  DiagnosticResult,
  KnowledgeGap,
  ConfidenceMatrix,
  CurriculumNode,
  CurriculumEdge,
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
 * Procedurally sanitizes and guarantees a strictly cycle-free DAG.
 * If Kahn's algorithm detects cycles in AI-generated edges, back-edges are pruned.
 */
export function sanitizeDAG(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
): { nodes: CurriculumNode[]; edges: CurriculumEdge[] } {
  // 1. Remove duplicate nodes & ensure valid IDs
  const uniqueNodesMap = new Map<string, CurriculumNode>();
  for (const n of nodes) {
    if (n && n.id && !uniqueNodesMap.has(n.id)) {
      uniqueNodesMap.set(n.id, { ...n });
    }
  }

  const cleanNodes = Array.from(uniqueNodesMap.values());
  const validNodeIds = new Set(cleanNodes.map(n => n.id));

  // 2. Filter edges to only reference existing nodes and avoid self-loops
  const candidateEdges = edges.filter(
    e => e.source && e.target && e.source !== e.target && validNodeIds.has(e.source) && validNodeIds.has(e.target)
  );

  // 3. Iteratively construct DAG without cycles using Kahn's check
  const acceptedEdges: CurriculumEdge[] = [];
  const edgeDeduplication = new Set<string>();

  for (const edge of candidateEdges) {
    const key = `${edge.source}->${edge.target}`;
    if (edgeDeduplication.has(key)) continue;

    // Test DAG validity with this edge added
    const testEdges = [...acceptedEdges, edge];
    const validation = validateDAG(cleanNodes, testEdges);

    if (!validation.hasCycles) {
      edgeDeduplication.add(key);
      acceptedEdges.push(edge);
    }
  }

  return {
    nodes: cleanNodes,
    edges: acceptedEdges,
  };
}

/**
 * Dynamically generates a tailored Knowledge Graph DAG for ANY given topic & diagnostic evaluation.
 */
export async function generateCurriculumGraph(params: {
  topic: string;
  targetGoal: string;
  evaluatedResult: EvaluatedAnswersResult;
}): Promise<{ nodes: EnrichedConceptNode[]; edges: CurriculumEdge[] }> {
  const { topic, targetGoal, evaluatedResult } = params;
  const gapsSummary = evaluatedResult.derivedGaps
    .map(g => `- ${g.concept} (${g.severity}): ${g.justification}`)
    .join('\n');

  const prompt = `Buatkan kurikulum Knowledge Graph terstruktur dalam bentuk Directed Acyclic Graph (DAG) untuk topik: "${topic}".
Target Tujuan Pelajar: "${targetGoal}".
Hasil Evaluasi Diagnostik Siswa:
Total Soal: ${evaluatedResult.total}, Benar: ${evaluatedResult.correctCount}.
Kesenjangan Pengetahuan (Gaps & Miskonsepsi) yang terdeteksi:
${gapsSummary || 'Tidak ada gap kritis, siswa menjawab dengan pemahaman tinggi.'}

Ketentuan Struktur Kurikulum:
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
      "is_gap": false
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
  return buildProceduralTopicDAG(topic, targetGoal, evaluatedResult);
}

/**
 * Procedural Fallback to synthesize a valid topic-aware DAG when AI provider is unreachable.
 * Dynamically incorporates student's specific gaps instead of falling back to static DSA mock.
 */
export function buildProceduralTopicDAG(
  topic: string,
  targetGoal: string,
  evaluatedResult: EvaluatedAnswersResult
): { nodes: EnrichedConceptNode[]; edges: CurriculumEdge[] } {
  const cleanTopic = topic.trim();
  const slugBase = cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Build nodes around the user's topic and detected gaps
  const gapConcepts = evaluatedResult.derivedGaps.map(g => g.concept);

  const rawNodes: CurriculumNode[] = [
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
