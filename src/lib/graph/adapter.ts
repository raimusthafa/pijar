import type { CurriculumNode, CurriculumEdge, DiagnosticResult, KnowledgeGap } from '@/types';
import type { EnrichedConceptNode } from './types';
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from '@/lib/ai/mock-data';
import { calculateHierarchicalLayout } from './layout';
import { buildAdjacencyMaps } from './engine';

// ================================================================
// PIJAR - Multi-Topic Graph Catalog & Diagnostic Adapter
// ================================================================

// ── ML Curriculum Template ──────────────────────────────────────
const ML_NODES: CurriculumNode[] = [
  { id: 'python-numpy',    label: 'Python & NumPy',           category: 'Fondasi',        description: 'Manipulasi vektor, matriks, dan broadcasting', status: 'completed',       estimated_minutes: 30, is_gap: false },
  { id: 'linear-algebra',  label: 'Aljabar Linier',           category: 'Matematika',     description: 'Dot product, rank matriks, dan eigenvalues',   status: 'prerequisite_gap', estimated_minutes: 45, is_gap: true },
  { id: 'calculus-grad',   label: 'Kalkulus & Turunan Parsial',category: 'Matematika',     description: 'Gradient vector dan chain rule',               status: 'prerequisite_gap', estimated_minutes: 45, is_gap: true },
  { id: 'prob-stats',      label: 'Probabilitas & Bayes',     category: 'Statistika',     description: 'Distribusi probabilitas dan maximum likelihood',status: 'ready',           estimated_minutes: 35, is_gap: false },
  { id: 'lin-reg',         label: 'Linear Regression',        category: 'Supervised',     description: 'Metode kuadrat terkecil dan regularisasi',     status: 'locked',          estimated_minutes: 40, is_gap: false },
  { id: 'gradient-descent',label: 'Gradient Descent & Adam',  category: 'Optimasi',       description: 'Optimasi bobot model via learning rate',       status: 'locked',          estimated_minutes: 50, is_gap: true },
  { id: 'neural-network',  label: 'Multilayer Perceptron',    category: 'Deep Learning',  description: 'Forward pass dan backpropagation',             status: 'locked',          estimated_minutes: 60, is_gap: false },
  { id: 'transformers',    label: 'Attention & Transformers', category: 'Modern AI',      description: 'Mekanisme self-attention dan LLM foundation',  status: 'locked',          estimated_minutes: 90, is_gap: false },
];

const ML_EDGES: CurriculumEdge[] = [
  { id: 'ml-e1', source: 'python-numpy',   target: 'lin-reg',          label: 'implementasi vektor' },
  { id: 'ml-e2', source: 'linear-algebra', target: 'lin-reg',          label: 'operasi matriks' },
  { id: 'ml-e3', source: 'calculus-grad',  target: 'gradient-descent', label: 'dasar gradien' },
  { id: 'ml-e4', source: 'lin-reg',        target: 'gradient-descent', label: 'loss minimization' },
  { id: 'ml-e5', source: 'gradient-descent', target: 'neural-network', label: 'algoritma backprop' },
  { id: 'ml-e6', source: 'prob-stats',     target: 'neural-network',   label: 'cross-entropy loss' },
  { id: 'ml-e7', source: 'neural-network', target: 'transformers',     label: 'arsitektur dasar' },
];

// ── Database Curriculum Template ────────────────────────────────
const DB_NODES: CurriculumNode[] = [
  { id: 'relational-model', label: 'Model Relasional & SQL',  category: 'Dasar',          description: 'Tabel, relasi foreign key, dan query dasar',   status: 'completed',       estimated_minutes: 25, is_gap: false },
  { id: 'indexing-btree',   label: 'Indexing & B-Trees',      category: 'Performa',       description: 'Struktur pencarian O(log n) pada storage disk', status: 'prerequisite_gap', estimated_minutes: 40, is_gap: true },
  { id: 'normalization',    label: 'Normalisasi Database (3NF)',category: 'Desain Skema',  description: 'Mencegah anomali update dan redundansi data',   status: 'ready',           estimated_minutes: 35, is_gap: false },
  { id: 'acid-tx',          label: 'Transaksi & ACID',        category: 'Integritas',     description: 'Atomicity, Isolation level, dan MVCC',         status: 'prerequisite_gap', estimated_minutes: 50, is_gap: true },
  { id: 'query-optimizer',  label: 'Query Plan & EXPLAIN',    category: 'Performa',       description: 'Cost-based optimization dan index scans',      status: 'locked',          estimated_minutes: 45, is_gap: false },
  { id: 'distributed-cap',  label: 'Teorema CAP & Replikasi', category: 'Distribusi',     description: 'Konsistensi data pada cluster terdistribusi',   status: 'locked',          estimated_minutes: 60, is_gap: false },
];

const DB_EDGES: CurriculumEdge[] = [
  { id: 'db-e1', source: 'relational-model', target: 'indexing-btree', label: 'optimasi tabel' },
  { id: 'db-e2', source: 'relational-model', target: 'normalization',  label: 'desain relasi' },
  { id: 'db-e3', source: 'indexing-btree',   target: 'query-optimizer', label: 'evaluasi indeks' },
  { id: 'db-e4', source: 'relational-model', target: 'acid-tx',        label: 'operasi atomik' },
  { id: 'db-e5', source: 'acid-tx',          target: 'distributed-cap', label: 'konsistensi multi-node' },
];

/**
 * Resolves baseline curriculum template by topic keyword.
 */
export function getBaselineCurriculum(topic: string): {
  topicName: string;
  nodes: CurriculumNode[];
  edges: CurriculumEdge[];
} {
  const t = topic.toLowerCase();
  if (t.includes('machine') || t.includes('ml') || t.includes('ai')) {
    return {
      topicName: 'Machine Learning',
      nodes: ML_NODES,
      edges: ML_EDGES,
    };
  }
  if (t.includes('data') && t.includes('base') || t.includes('db') || t.includes('sql')) {
    return {
      topicName: 'Database & SQL',
      nodes: DB_NODES,
      edges: DB_EDGES,
    };
  }
  // Default to Data Structures & Algorithms
  return {
    topicName: 'Struktur Data & Algoritma',
    nodes: MOCK_GRAPH_NODES,
    edges: MOCK_GRAPH_EDGES,
  };
}

/**
 * Merges diagnostic results into the knowledge graph.
 * Injects justifications, prerequisite notes, and updates node gap flags.
 */
export function adaptDiagnosticToGraph(
  topic: string,
  diagnosticResult: DiagnosticResult | null
): {
  topicName: string;
  nodes: EnrichedConceptNode[];
  edges: CurriculumEdge[];
  isDemoFallback: boolean;
} {
  const baseline = getBaselineCurriculum(topic);
  const isDemoFallback = !diagnosticResult || !diagnosticResult.identified_gaps || diagnosticResult.identified_gaps.length === 0;

  const gaps: KnowledgeGap[] = diagnosticResult?.identified_gaps || [];
  const gapConceptMap = new Map<string, KnowledgeGap>();

  for (const g of gaps) {
    // Normalization for fuzzy match
    const clean = g.concept.toLowerCase().trim();
    gapConceptMap.set(clean, g);
  }

  // Clone and enrich nodes
  const updatedNodes: CurriculumNode[] = baseline.nodes.map(n => {
    const nodeLabelLower = n.label.toLowerCase();
    
    // Find matching diagnostic gap
    let matchedGap: KnowledgeGap | undefined;
    for (const [gapName, gapObj] of gapConceptMap.entries()) {
      if (nodeLabelLower.includes(gapName) || gapName.includes(nodeLabelLower)) {
        matchedGap = gapObj;
        break;
      }
    }

    if (matchedGap) {
      return {
        ...n,
        status: 'prerequisite_gap' as const,
        is_gap: true,
      };
    }

    return { ...n };
  });

  // Calculate layout coordinates
  const positioned = calculateHierarchicalLayout(updatedNodes, baseline.edges);

  // Attach direct prerequisites and dependents arrays to each node
  const { prerequisitesMap, dependentsMap } = buildAdjacencyMaps(updatedNodes, baseline.edges);

  const enrichedNodes: EnrichedConceptNode[] = positioned.map(n => {
    // Check if node has diagnostic justification
    let justification: string | undefined;
    for (const [gapName, gapObj] of gapConceptMap.entries()) {
      if (n.label.toLowerCase().includes(gapName) || gapName.includes(n.label.toLowerCase())) {
        justification = gapObj.justification;
        break;
      }
    }

    return {
      ...n,
      justification: justification || (n.is_gap ? 'Konsep ini adalah prasyarat krusial yang perlu diperkuat untuk membuka materi lanjutan.' : undefined),
      prerequisites: prerequisitesMap.get(n.id) || [],
      unlocked_concepts: dependentsMap.get(n.id) || [],
    };
  });

  return {
    topicName: baseline.topicName,
    nodes: enrichedNodes,
    edges: baseline.edges,
    isDemoFallback,
  };
}
