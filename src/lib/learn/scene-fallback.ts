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
    s2: 'Cara kerjanya',
    s3: 'Rangkuman dan latihan',
    n1: (l: string, t: string) => `Mari kenali ${l}. Konsep ini sering muncul dalam ${t}, jadi memahaminya sekarang akan mempermudah materi berikutnya.`,
    n2: 'Perhatikan gambarnya. Setiap bagian saling terhubung, dan kita ikuti alurnya dari awal sampai hasil akhir.',
    n3: (l: string) => `Itu inti dari ${l}. Sekarang uji pemahamanmu lewat kuis singkat di bawah.`,
    c1a: (l: string) => `Mengenal ${l}.`,
    c1b: (t: string) => `Konsep ini sering dipakai dalam ${t}.`,
    c2a: 'Ikuti alurnya dari awal.',
    c2b: 'Setiap bagian punya perannya sendiri.',
    c3a: 'Ringkas: pahami, coba, lalu uji.',
    c3b: 'Lanjut ke kuis checkpoint.',
    stages: ['Pahami', 'Coba', 'Kuis'],
    notes: ['konsepnya', 'contoh kode', 'cek diri'],
    note: 'Perhatikan bentuknya',
  },
  en: {
    title: (l: string) => `Visual explanation: ${l}`,
    s1: (l: string) => `Introducing ${l}`,
    s2: 'How it works',
    s3: 'Recap and practice',
    n1: (l: string, t: string) => `Let us look at ${l}. It comes up often in ${t}, so understanding it now makes the next lessons easier.`,
    n2: 'Watch the picture. The parts are connected, and we follow the flow from the start to the final result.',
    n3: (l: string) => `That is the core of ${l}. Now check your understanding with the short quiz below.`,
    c1a: (l: string) => `Getting to know ${l}.`,
    c1b: (t: string) => `This idea shows up often in ${t}.`,
    c2a: 'Follow the flow from the start.',
    c2b: 'Each part has its own job.',
    c3a: 'In short: understand, try, then test.',
    c3b: 'On to the checkpoint quiz.',
    stages: ['Understand', 'Try', 'Quiz'],
    notes: ['the concept', 'a code example', 'check yourself'],
    note: 'Watch the shape',
  },
} as const;

function secondScene(i: FallbackVideoInput): VideoScene['recipe'] {
  const x = T[i.language];
  if (i.mathy) return { name: i.mathRecipe ?? 'derivative-tangent', params: {} };
  switch (i.visual) {
    case 'call-stack':
      return { name: 'call-stack', params: { fn: i.label.replace(/\W+/g, '').slice(0, 14).toLowerCase() || 'f', n: 4 } };
    case 'loss-landscape':
      return { name: 'gradient-descent', params: {} };
    case 'tree-structure':
      return { name: 'tree-traversal', params: {} };
    case 'data-flow':
      return { name: 'pipeline', params: {} };
    case 'code-execution':
      return { name: 'code-walk', params: {} };
    default:
      return { name: 'pipeline', params: { stages: [i.category, i.label, i.topic].map((s) => s.slice(0, 20)), notes: [x.note] } };
  }
}

export function buildFallbackVideo(i: FallbackVideoInput): VideoScriptPlan {
  const x = T[i.language];
  const firstRecipe: VideoScene['recipe'] = i.mathy
    ? { name: 'function-plot', params: {} }
    : { name: 'concept-map', params: { center: i.label.slice(0, 28), points: [i.category, i.topic.toUpperCase()].map((s) => s.slice(0, 24)) } };
  const scenes: VideoScene[] = [
    {
      id: `${i.nodeId}-sc1`, sceneNumber: 1, title: x.s1(i.label), durationSeconds: 12, narration: x.n1(i.label, i.topic),
      recipe: firstRecipe,
      captions: [
        { startSeconds: 0, endSeconds: 6, text: x.c1a(i.label) },
        { startSeconds: 6, endSeconds: 12, text: x.c1b(i.topic) },
      ],
    },
    {
      id: `${i.nodeId}-sc2`, sceneNumber: 2, title: x.s2, durationSeconds: 14, narration: x.n2,
      recipe: secondScene(i),
      captions: [
        { startSeconds: 0, endSeconds: 7, text: x.c2a },
        { startSeconds: 7, endSeconds: 14, text: x.c2b },
      ],
    },
    {
      id: `${i.nodeId}-sc3`, sceneNumber: 3, title: x.s3, durationSeconds: 12, narration: x.n3(i.label),
      recipe: { name: 'pipeline', params: { stages: [...x.stages], notes: [...x.notes] } },
      captions: [
        { startSeconds: 0, endSeconds: 6, text: x.c3a },
        { startSeconds: 6, endSeconds: 12, text: x.c3b },
      ],
    },
  ];
  return { conceptId: i.nodeId, title: x.title(i.label), totalDurationSeconds: 38, scenes };
}
