// ================================================================
// PIJAR - Offline fallback video: three recipe-based scenes chosen
// by topic type. Used when the AI provider is unavailable. Never a
// text-only card: every scene has an animated stage.
// ================================================================

import type { VideoScriptPlan, VideoScene, VisualSceneType } from './types';
import type { LessonLanguage } from './cache-key';

export interface FallbackVideoInput {
  nodeId: string;
  label: string;
  topic: string;
  category: string;
  desc: string;
  mathy: boolean;
  visual: VisualSceneType;
  /** Name of the math recipe for the second scene when `mathy`. */
  mathRecipe?: string;
  language: LessonLanguage;
}

const T = {
  id: {
    title: (l: string) => `Penjelasan visual: ${l}`,
    s1: (l: string) => `Pengantar ${l}`,
    s2: 'Anatomi dan Prinsip Kerja',
    s3: 'Simulasi Alur Eksekusi',
    s4: 'Rangkuman dan Implementasi',
    n1: (l: string, t: string) => `Mari kenali konsep ${l}. Materi ini memegang peranan krusial dalam domain ${t}, menjamin efisiensi dan kebenaran alur komputasi.`,
    n2: 'Perhatikan diagram di panggung. Setiap komponen saling terhubung secara terstruktur, membangun fondasi logika yang kokoh.',
    n3: 'Sekarang amati bagaimana proses berjalan dari awal hingga menghasilkan keluaran yang diharapkan secara berurutan.',
    n4: (l: string) => `Itulah esensi dari ${l}. Kuasai alur berpikir konseptualnya, lalu uji pemahamanmu lewat kuis checkpoint di bawah.`,
    c1a: (l: string) => `Mengenal fondasi penting dari ${l}.`,
    c1b: (t: string) => `Konsep ini krusial dalam kurikulum ${t}.`,
    c2a: 'Struktur dan hubungan antar komponen logis.',
    c2b: 'Setiap bagian memiliki peran terdefinisi dengan jelas.',
    c3a: 'Ikuti alur data dan eksekusi langkah demi langkah.',
    c3b: 'Hasil akhir diperoleh secara deterministik dan terukur.',
    c4a: 'Rangkuman: pahami konsep, terapkan pola, lalu uji diri.',
    c4b: 'Lanjutkan pembelajaran ke kuis checkpoint.',
    stages: ['Fondasi', 'Eksekusi', 'Kuis'],
    notes: ['prinsip inti', 'alur proses', 'evaluasi mandiri'],
    note: 'Alur komputasi terstruktur',
  },
  en: {
    title: (l: string) => `Visual explanation: ${l}`,
    s1: (l: string) => `Introducing ${l}`,
    s2: 'Anatomy and Core Logic',
    s3: 'Execution Flow Simulation',
    s4: 'Summary and Application',
    n1: (l: string, t: string) => `Let us explore ${l}. This concept plays a vital role in ${t}, ensuring correctness and computational efficiency.`,
    n2: 'Observe the structure on the stage. Each part connects systematically to form a solid logical foundation.',
    n3: 'Now watch how the execution flows step by step from initialization to the final intended outcome.',
    n4: (l: string) => `That is the essence of ${l}. Master this conceptual model, then test your understanding with the quiz below.`,
    c1a: (l: string) => `Understanding the key foundation of ${l}.`,
    c1b: (t: string) => `This idea is essential in ${t}.`,
    c2a: 'Structure and relationships between logical components.',
    c2b: 'Each component has a clear and well-defined role.',
    c3a: 'Follow the data flow and execution step by step.',
    c3b: 'The final result is obtained deterministically.',
    c4a: 'Summary: understand, apply patterns, then test yourself.',
    c4b: 'Proceed forward to the checkpoint quiz below.',
    stages: ['Foundation', 'Execution', 'Quiz'],
    notes: ['core principle', 'flow process', 'self evaluation'],
    note: 'Structured computation flow',
  },
} as const;

function secondScene(i: FallbackVideoInput): VideoScene['recipe'] {
  const x = T[i.language];
  if (i.mathy) return { name: i.mathRecipe ?? 'function-plot', params: {} };
  switch (i.visual) {
    case 'call-stack':
      return { name: 'call-stack', params: { fn: i.label.replace(/\W+/g, '').slice(0, 14).toLowerCase() || 'f', n: 4 } };
    case 'loss-landscape':
      return { name: 'gradient-descent', params: {} };
    case 'tree-structure':
      return { name: 'tree-traversal', params: {} };
    case 'data-flow':
      return { name: 'pipeline', params: { stages: [i.category, i.label, 'Output'].map((s) => s.slice(0, 20)), notes: [x.note] } };
    case 'code-execution':
      return { name: 'code-walk', params: {} };
    default:
      return { name: 'pipeline', params: { stages: [i.category, i.label, i.topic].map((s) => s.slice(0, 20)), notes: [x.note] } };
  }
}

function thirdScene(i: FallbackVideoInput): VideoScene['recipe'] {
  if (i.mathy) return { name: 'concept-map', params: { center: i.label.slice(0, 28), points: ['Domain', 'Transformasi', 'Solusi'] } };
  if (i.visual === 'code-execution' || i.visual === 'call-stack') {
    return { name: 'code-walk', params: {} };
  }
  if (i.visual === 'tree-structure') {
    return { name: 'tree-traversal', params: {} };
  }
  return { name: 'pipeline', params: { stages: ['Input Query', 'Optimasi Plan', 'Result Set'], notes: ['eksekusi'] } };
}

export function buildFallbackVideo(i: FallbackVideoInput): VideoScriptPlan {
  const x = T[i.language];
  const firstRecipe: VideoScene['recipe'] = i.mathy
    ? { name: 'function-plot', params: {} }
    : { name: 'concept-map', params: { center: i.label.slice(0, 28), points: [i.category, i.topic.toUpperCase(), 'Logika'].map((s) => s.slice(0, 24)) } };
  const scenes: VideoScene[] = [
    {
      id: `${i.nodeId}-sc1`, sceneNumber: 1, title: x.s1(i.label), durationSeconds: 20, narration: x.n1(i.label, i.topic),
      recipe: firstRecipe,
      captions: [
        { startSeconds: 0, endSeconds: 10, text: x.c1a(i.label) },
        { startSeconds: 10, endSeconds: 20, text: x.c1b(i.topic) },
      ],
    },
    {
      id: `${i.nodeId}-sc2`, sceneNumber: 2, title: x.s2, durationSeconds: 22, narration: x.n2,
      recipe: secondScene(i),
      captions: [
        { startSeconds: 0, endSeconds: 11, text: x.c2a },
        { startSeconds: 11, endSeconds: 22, text: x.c2b },
      ],
    },
    {
      id: `${i.nodeId}-sc3`, sceneNumber: 3, title: x.s3, durationSeconds: 22, narration: x.n3,
      recipe: thirdScene(i),
      captions: [
        { startSeconds: 0, endSeconds: 11, text: x.c3a },
        { startSeconds: 11, endSeconds: 22, text: x.c3b },
      ],
    },
    {
      id: `${i.nodeId}-sc4`, sceneNumber: 4, title: x.s4, durationSeconds: 20, narration: x.n4(i.label),
      recipe: { name: 'pipeline', params: { stages: [...x.stages], notes: [...x.notes] } },
      captions: [
        { startSeconds: 0, endSeconds: 10, text: x.c4a },
        { startSeconds: 10, endSeconds: 20, text: x.c4b },
      ],
    },
  ];
  return { conceptId: i.nodeId, title: x.title(i.label), totalDurationSeconds: 84, scenes };
}
