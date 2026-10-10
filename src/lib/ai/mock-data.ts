// ================================================================
// PIJAR - Mock Data untuk Hackathon Demo Mode
// Digunakan ketika NEXT_PUBLIC_DEMO_MODE=true atau API AI gagal
// ================================================================

import type {
  DiagnosticQuestion,
  DiagnosticResult,
  CurriculumNode,
  CurriculumEdge,
  LearningMaterial,
  MisconceptionFeedback,
} from '@/types';

// ── MOCK: Pre-test Questions ──────────────────────────────────
export const MOCK_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'q1',
    question: 'Apa perbedaan utama antara Array dan Linked List dalam hal akses elemen?',
    options: [
      'Array memiliki akses O(1), Linked List O(n)',
      'Linked List memiliki akses O(1), Array O(n)',
      'Keduanya memiliki akses O(1)',
      'Keduanya memiliki akses O(n)',
    ],
    concept_tested: 'Array vs Linked List',
  },
  {
    id: 'q2',
    question: 'Manakah yang merupakan ciri-ciri struktur data Stack?',
    options: [
      'First In First Out (FIFO)',
      'Last In First Out (LIFO)',
      'Random Access',
      'Priority-based access',
    ],
    concept_tested: 'Stack',
  },
  {
    id: 'q3',
    question: 'Apa kompleksitas waktu Binary Search pada array yang sudah terurut?',
    options: ['O(n)', 'O(n²)', 'O(log n)', 'O(n log n)'],
    concept_tested: 'Binary Search',
  },
  {
    id: 'q4',
    question: 'Dalam algoritma BFS (Breadth-First Search), struktur data apa yang digunakan?',
    options: ['Stack', 'Queue', 'Heap', 'Tree'],
    concept_tested: 'BFS & Graph Traversal',
  },
  {
    id: 'q5',
    question: 'Rekursi membutuhkan pemahaman tentang konsep apa dari struktur data?',
    options: ['Queue', 'Hash Table', 'Stack (call stack)', 'Graph'],
    concept_tested: 'Rekursi & Stack',
  },
];

// ── MOCK: Diagnostic Result ───────────────────────────────────
export const MOCK_DIAGNOSTIC_RESULT: DiagnosticResult = {
  topic: 'Struktur Data & Algoritma',
  total_questions: 5,
  correct_count: 2,
  identified_gaps: [
    {
      concept: 'Graph Traversal (BFS & DFS)',
      severity: 'critical',
      justification:
        'Graph traversal adalah fondasi untuk memahami algoritma pathfinding dan network problems. Tanpa konsep ini, kamu tidak akan bisa mengerjakan soal-soal graph di interview.',
      prerequisites: ['Queue', 'Stack', 'Rekursi'],
    },
    {
      concept: 'Rekursi',
      severity: 'critical',
      justification:
        'Rekursi adalah kunci untuk memahami tree traversal, divide & conquer, dan dynamic programming. Hampir semua algoritma lanjutan membutuhkan pemahaman rekursi yang kuat.',
      prerequisites: ['Stack (Call Stack)', 'Base Case & Recursive Case'],
    },
    {
      concept: 'Binary Search',
      severity: 'moderate',
      justification:
        'Binary Search adalah contoh klasik dari paradigma divide & conquer dan sering muncul sebagai sub-problem dalam algoritma yang lebih kompleks.',
      prerequisites: ['Array', 'Sorting'],
    },
  ],
  summary_narrative:
    'Kamu sudah memahami dasar Array, Linked List, dan Stack. Namun ada beberapa gap kritis: Graph Traversal dan Rekursi yang menjadi fondasi untuk topik-topik lanjutan. Kurikulum di bawah akan membantu kamu membangun pondasi tersebut secara terstruktur.',
};

// ── MOCK: Knowledge Graph Nodes ───────────────────────────────
export const MOCK_GRAPH_NODES: CurriculumNode[] = [
  { id: 'array',         label: 'Array',            category: 'Dasar',          description: 'Struktur data sekuensial dengan akses O(1)', status: 'completed',       estimated_minutes: 20,  is_gap: false },
  { id: 'linked-list',   label: 'Linked List',       category: 'Dasar',          description: 'Node-node yang saling terhubung',            status: 'completed',       estimated_minutes: 30,  is_gap: false },
  { id: 'stack',         label: 'Stack (LIFO)',       category: 'Dasar',          description: 'Struktur data Last In First Out',            status: 'completed',       estimated_minutes: 25,  is_gap: false },
  { id: 'queue',         label: 'Queue (FIFO)',       category: 'Dasar',          description: 'Struktur data First In First Out',           status: 'ready',           estimated_minutes: 25,  is_gap: false },
  { id: 'rekursi',       label: 'Rekursi',            category: 'Konsep Kunci',   description: 'Fungsi yang memanggil dirinya sendiri',      status: 'prerequisite_gap', estimated_minutes: 45, is_gap: true  },
  { id: 'binary-search', label: 'Binary Search',      category: 'Algoritma',      description: 'Pencarian efisien O(log n)',                  status: 'prerequisite_gap', estimated_minutes: 30, is_gap: true  },
  { id: 'tree',          label: 'Tree & BST',         category: 'Struktur Lanjut', description: 'Hierarki node dengan relasi parent-child',  status: 'locked',          estimated_minutes: 60,  is_gap: false },
  { id: 'graph',         label: 'Graph',              category: 'Struktur Lanjut', description: 'Node (vertex) yang terhubung via edge',     status: 'locked',          estimated_minutes: 45,  is_gap: false },
  { id: 'bfs-dfs',       label: 'BFS & DFS',          category: 'Algoritma',      description: 'Graph traversal: Breadth vs Depth First',    status: 'locked',          estimated_minutes: 60,  is_gap: true  },
  { id: 'dp',            label: 'Dynamic Programming', category: 'Algoritma Lanjut', description: 'Memoization & tabulation untuk optimasi', status: 'locked',          estimated_minutes: 90,  is_gap: false },
];

// ── MOCK: Knowledge Graph Edges ───────────────────────────────
export const MOCK_GRAPH_EDGES: CurriculumEdge[] = [
  { id: 'e1',  source: 'array',         target: 'binary-search', label: 'dibutuhkan untuk' },
  { id: 'e2',  source: 'stack',         target: 'rekursi',       label: 'memahami call stack' },
  { id: 'e3',  source: 'queue',         target: 'bfs-dfs',       label: 'digunakan oleh BFS' },
  { id: 'e4',  source: 'rekursi',       target: 'tree',          label: 'traversal via rekursi' },
  { id: 'e5',  source: 'rekursi',       target: 'bfs-dfs',       label: 'DFS berbasis rekursi' },
  { id: 'e6',  source: 'tree',          target: 'graph',         label: 'graph generalisasi tree' },
  { id: 'e7',  source: 'bfs-dfs',       target: 'dp',            label: 'fondasi DP on graphs' },
  { id: 'e8',  source: 'binary-search', target: 'dp',            label: 'pola divide & conquer' },
];

// ── MOCK: Learning Material (Rekursi) ─────────────────────────
export const MOCK_MATERIAL_REKURSI: LearningMaterial = {
  node_id: 'rekursi',
  title: 'Rekursi: Fungsi yang Memanggil Dirinya Sendiri',
  summary: 'Rekursi adalah teknik pemrograman di mana sebuah fungsi menyelesaikan masalah dengan memanggil dirinya sendiri dengan input yang lebih kecil, hingga mencapai base case.',
  key_concepts: [
    'Base Case: kondisi berhenti rekursi',
    'Recursive Case: pemanggilan diri sendiri dengan input lebih kecil',
    'Call Stack: tumpukan pemanggilan fungsi di memori',
    'Stack Overflow: akibat rekursi tanpa base case yang benar',
  ],
  text_content: `## Apa itu Rekursi?

Bayangkan kamu berdiri di depan kaca, dan di belakangmu ada kaca lain. Kamu akan melihat pantulan tak terbatas — itulah gambaran rekursi tanpa batas (yang akan menyebabkan *stack overflow*).

Rekursi yang **baik** adalah seperti kamu menghitung anak tangga: kamu tahu kapan harus berhenti (lantai dasar = *base case*), dan setiap langkah mendekatkan kamu ke lantai dasar.

## Anatomi Fungsi Rekursif

Setiap fungsi rekursif WAJIB memiliki dua bagian:
1. **Base Case** — kondisi untuk berhenti
2. **Recursive Case** — kondisi di mana fungsi memanggil dirinya sendiri

## Contoh: Faktorial

\`\`\`
factorial(5) 
  = 5 × factorial(4)
        = 4 × factorial(3)
              = 3 × factorial(2)
                    = 2 × factorial(1)
                          = 1  ← BASE CASE
\`\`\``,
  examples: [
    {
      title: 'Faktorial Rekursif',
      language: 'typescript',
      code: `function factorial(n: number): number {
  // Base Case: hentikan rekursi
  if (n <= 1) return 1;

  // Recursive Case: panggil diri sendiri dengan n-1
  return n * factorial(n - 1);
}

console.log(factorial(5)); // Output: 120`,
      explanation: 'Setiap panggilan memperkecil masalah (n-1) hingga mencapai n=1 sebagai base case.',
    },
  ],
  mini_quiz: [
    {
      id: 'mq1',
      question: 'Apa yang terjadi jika fungsi rekursif tidak memiliki base case?',
      options: [
        'Fungsi berjalan normal',
        'Terjadi Stack Overflow (program crash)',
        'Fungsi mengembalikan 0',
        'Kompilasi error',
      ],
      correct_index: 1,
      explanation: 'Tanpa base case, fungsi akan terus memanggil dirinya sendiri tanpa henti hingga memori Call Stack habis, menyebabkan Stack Overflow error.',
    },
  ],
};

// ── MOCK: Misconception Feedback ─────────────────────────────
export const MOCK_MISCONCEPTION: MisconceptionFeedback = {
  question_id: 'mq1',
  user_selected: 0,
  correct_index: 1,
  misconception_label: 'Salah paham tentang peran base case',
  correction_narrative:
    'Kamu memilih "Fungsi berjalan normal" — ini adalah kesalahpahaman yang umum. Base case bukan sekadar opsional, melainkan **mekanisme penghenti** yang wajib ada. Tanpanya, fungsi akan terus menambah frame baru ke Call Stack (bayangkan menumpuk piring tanpa batas) hingga memori habis. Ini disebut Stack Overflow.',
};
