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

// ── Math Curriculum Template ────────────────────────────────────
const MATH_NODES: CurriculumNode[] = [
  { id: 'set-theory',   label: 'Teori Himpunan & Notasi',  category: 'Fondasi',    description: 'Operasi gabungan, irisan, dan komplemen',       status: 'completed',       estimated_minutes: 25, is_gap: false },
  { id: 'prop-logic',   label: 'Logika Proposisi',         category: 'Logika',     description: 'Tabel kebenaran, implikasi, dan ekuivalensi',   status: 'prerequisite_gap', estimated_minutes: 35, is_gap: true },
  { id: 'proof-tech',   label: 'Metode Pembuktian & Induksi', category: 'Dasar',    description: 'Induksi matematika dan kontradiksi',           status: 'ready',           estimated_minutes: 40, is_gap: false },
  { id: 'graph-theory', label: 'Teori Graf & Pohon',       category: 'Struktur',   description: 'Simpul, sisi, traversal graf, dan pohon rentang',status: 'locked',          estimated_minutes: 45, is_gap: false },
  { id: 'combinatorics',label: 'Kombinatorika & Peluang',  category: 'Pencacahan', description: 'Permutasi, kombinasi, dan prinsip pigeonhole',   status: 'locked',          estimated_minutes: 50, is_gap: false },
];

const MATH_EDGES: CurriculumEdge[] = [
  { id: 'math-e1', source: 'set-theory', target: 'prop-logic',   label: 'dasar logika' },
  { id: 'math-e2', source: 'prop-logic', target: 'proof-tech',   label: 'aturan inferensi' },
  { id: 'math-e3', source: 'proof-tech', target: 'graph-theory', label: 'dasar relasi' },
  { id: 'math-e4', source: 'set-theory', target: 'combinatorics', label: 'kardinalitas' },
  { id: 'math-e5', source: 'proof-tech', target: 'combinatorics', label: 'pembuktian kombinatorik' },
];

// ── Web Development Curriculum Template ──────────────────────────
const WEB_NODES: CurriculumNode[] = [
  { id: 'html-css',         label: 'Semantic HTML & CSS',     category: 'Fondasi',      description: 'Struktur dokumen, flexbox, dan grid layout',      status: 'completed',       estimated_minutes: 25, is_gap: false },
  { id: 'js-dom',           label: 'JavaScript Modern & DOM',  category: 'Dasar',        description: 'ES6+, event listener, dan manipulasi elemen',    status: 'ready',           estimated_minutes: 35, is_gap: false },
  { id: 'async-js',         label: 'Async JS & Promises',     category: 'Logika Async', description: 'Event loop, callback queue, dan Fetch API',      status: 'prerequisite_gap', estimated_minutes: 45, is_gap: true },
  { id: 'react-components', label: 'React State & Lifecycle', category: 'Frontend',     description: 'Komposisi komponen, hooks (useState, useEffect)',status: 'locked',          estimated_minutes: 50, is_gap: false },
  { id: 'next-app',         label: 'Next.js App Router & SSR',category: 'Fullstack',    description: 'Server components, dynamic routing, dan API route',status: 'locked',        estimated_minutes: 60, is_gap: false },
];

const WEB_EDGES: CurriculumEdge[] = [
  { id: 'web-e1', source: 'html-css',         target: 'js-dom',           label: 'interaktivitas' },
  { id: 'web-e2', source: 'js-dom',           target: 'async-js',         label: 'data fetching' },
  { id: 'web-e3', source: 'js-dom',           target: 'react-components', label: 'komponen UI' },
  { id: 'web-e4', source: 'async-js',         target: 'react-components', label: 'side-effects' },
  { id: 'web-e5', source: 'react-components', target: 'next-app',         label: 'arsitektur fullstack' },
];

// ── Statistics Curriculum Template ──────────────────────────────
const STATS_NODES: CurriculumNode[] = [
  { id: 'descriptive-stats', label: 'Statistik Deskriptif',    category: 'Fondasi',     description: 'Mean, median, deviasi standar, dan kuartil',     status: 'completed',       estimated_minutes: 25, is_gap: false },
  { id: 'prob-rules',        label: 'Kaidah Probabilitas',     category: 'Dasar',       description: 'Peluang gabungan, independensi, dan komplemen',   status: 'ready',           estimated_minutes: 30, is_gap: false },
  { id: 'random-variables',  label: 'Variabel Acak & Distribusi',category: 'Distribusi',  description: 'Distribusi normal, binomial, dan Poisson',       status: 'prerequisite_gap', estimated_minutes: 45, is_gap: true },
  { id: 'bayes-theorem',     label: 'Teorema Bayes',           category: 'Inferensi',   description: 'Peluang bersyarat dan posterior update',         status: 'prerequisite_gap', estimated_minutes: 40, is_gap: true },
  { id: 'hypothesis-test',   label: 'Uji Hipotesis & p-Value', category: 'Pengujian',   description: 'Null hypothesis, t-test, dan confidence interval', status: 'locked',         estimated_minutes: 50, is_gap: false },
];

const STATS_EDGES: CurriculumEdge[] = [
  { id: 'stats-e1', source: 'descriptive-stats', target: 'prob-rules',       label: 'dasar sebaran data' },
  { id: 'stats-e2', source: 'prob-rules',        target: 'random-variables', label: 'fungsi kepekatan' },
  { id: 'stats-e3', source: 'prob-rules',        target: 'bayes-theorem',    label: 'kondisi bersyarat' },
  { id: 'stats-e4', source: 'random-variables',  target: 'hypothesis-test',  label: 'sampling distribution' },
  { id: 'stats-e5', source: 'bayes-theorem',     target: 'hypothesis-test',  label: 'evaluasi signifikansi' },
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
  if (t.includes('math') || t.includes('diskrit') || t.includes('matematika')) {
    return {
      topicName: 'Matematika Diskrit',
      nodes: MATH_NODES,
      edges: MATH_EDGES,
    };
  }
  if (t.includes('web') || t.includes('react') || t.includes('frontend')) {
    return {
      topicName: 'Web Development',
      nodes: WEB_NODES,
      edges: WEB_EDGES,
    };
  }
  if (t.includes('stat') || t.includes('probabilitas')) {
    return {
      topicName: 'Statistik & Probabilitas',
      nodes: STATS_NODES,
      edges: STATS_EDGES,
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
 * Merges diagnostic results and user mastery into the knowledge graph.
 * Injects justifications, prerequisite notes, and dynamically resolves ready/locked states.
 */
export function adaptDiagnosticToGraph(
  topic: string,
  diagnosticResult: DiagnosticResult | null,
  masteredNodeIds?: Set<string> | string[]
): {
  topicName: string;
  nodes: EnrichedConceptNode[];
  edges: CurriculumEdge[];
  isDemoFallback: boolean;
} {
  const baseline = getBaselineCurriculum(topic);
  const masteredSet = new Set(
    Array.isArray(masteredNodeIds)
      ? masteredNodeIds
      : masteredNodeIds
      ? Array.from(masteredNodeIds)
      : []
  );

  const isDemoFallback =
    !diagnosticResult ||
    !diagnosticResult.identified_gaps ||
    diagnosticResult.identified_gaps.length === 0;

  const gaps: KnowledgeGap[] = diagnosticResult?.identified_gaps || [];
  const gapConceptMap = new Map<string, KnowledgeGap>();
  const gapNodeIdMap = new Map<string, KnowledgeGap>();

  for (const g of gaps) {
    if (g.target_node_id) {
      gapNodeIdMap.set(g.target_node_id, g);
    }
    const clean = g.concept.toLowerCase().trim();
    gapConceptMap.set(clean, g);
  }

  // Pre-calculate adjacency maps for baseline
  const { prerequisitesMap: basePrereqs } = buildAdjacencyMaps(baseline.nodes, baseline.edges);

  // 1. Initial pass: determine gaps and mastered concepts
  const updatedNodes: CurriculumNode[] = baseline.nodes.map(n => {
    // If user has explicitly mastered this node, mark completed
    if (masteredSet.has(n.id)) {
      return {
        ...n,
        status: 'completed' as const,
        is_gap: false,
      };
    }

    // Check if node is an identified gap
    let matchedGap: KnowledgeGap | undefined = gapNodeIdMap.get(n.id);
    if (!matchedGap) {
      const nodeLabelLower = n.label.toLowerCase();
      for (const [gapName, gapObj] of gapConceptMap.entries()) {
        if (nodeLabelLower.includes(gapName) || gapName.includes(nodeLabelLower)) {
          matchedGap = gapObj;
          break;
        }
      }
    }

    if (matchedGap) {
      return {
        ...n,
        status: 'prerequisite_gap' as const,
        is_gap: true,
      };
    }

    // If diagnostic was taken and node was NOT in gaps:
    if (!isDemoFallback) {
      // If node was marked completed in baseline (e.g. foundational node), retain completed
      if (n.status === 'completed') {
        return { ...n, is_gap: false };
      }
      // Otherwise initialize as ready or locked pending prerequisite verification
      return {
        ...n,
        status: 'ready' as const,
        is_gap: false,
      };
    }

    return { ...n };
  });

  // 2. Second pass: recalculate locked vs ready based on prerequisite completion
  const nodeStatusMap = new Map<string, CurriculumNode['status']>(
    updatedNodes.map(n => [n.id, n.status])
  );

  const finalNodes = updatedNodes.map(n => {
    if (n.status === 'completed' || n.status === 'prerequisite_gap') {
      return n;
    }

    const parents = basePrereqs.get(n.id) || [];
    const allParentsCompleted = parents.every(
      pId => nodeStatusMap.get(pId) === 'completed'
    );

    return {
      ...n,
      status: allParentsCompleted ? ('ready' as const) : ('locked' as const),
    };
  });

  // 3. Calculate layout coordinates
  const positioned = calculateHierarchicalLayout(finalNodes, baseline.edges);

  // 4. Attach direct prerequisites and dependents arrays to each node
  const { prerequisitesMap, dependentsMap } = buildAdjacencyMaps(finalNodes, baseline.edges);

  const enrichedNodes: EnrichedConceptNode[] = positioned.map(n => {
    // Check if node has diagnostic justification
    let justification: string | undefined = gapNodeIdMap.get(n.id)?.justification;
    if (!justification) {
      for (const [gapName, gapObj] of gapConceptMap.entries()) {
        if (n.label.toLowerCase().includes(gapName) || gapName.includes(n.label.toLowerCase())) {
          justification = gapObj.justification;
          break;
        }
      }
    }

    return {
      ...n,
      justification:
        justification ||
        (n.is_gap
          ? 'Konsep ini adalah prasyarat krusial yang perlu diperkuat untuk membuka materi lanjutan.'
          : undefined),
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
