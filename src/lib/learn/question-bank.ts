/* eslint-disable @typescript-eslint/no-explicit-any -- AI JSON and the Supabase client are untyped here on purpose */
// ================================================================
// PIJAR - Question bank (cache first, one AI call for many questions)
// Order: question_bank table -> AI (3 easy + 3 medium + 3 hard per call) -> mock/generic.
// The AI free tier is tiny, so a call fills ALL difficulties and caches them.
// Heavy imports are dynamic so the pure parts can run under node --test.
// ================================================================

import { MOCK_DIAGNOSTIC_QUESTIONS } from '../ai/mock-data.ts';
import { MATH_FORMAT_NOTE } from './math-text.ts';

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export interface BankQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
  conceptTested?: string;
}

export interface GetQuestionsParams {
  topic: string;
  nodeId: string;
  label?: string;
  difficulty: Difficulty;
  count?: number;
  language?: 'id' | 'en';
}

/** The bank key for a topic in one language, so English users never get cached Indonesian questions (and the reverse). Indonesian keeps the plain topic, so rows saved earlier still match. */
export function bankTopic(topic: string, language?: 'id' | 'en'): string {
  return language === 'en' ? `${topic} [en]` : topic;
}

export function validateQuestion(q: unknown): q is Omit<BankQuestion, 'difficulty'> {
  const x = q as Record<string, unknown> | null;
  return !!x && typeof x.id === 'string' && !!x.id && typeof x.question === 'string' && !!x.question
    && Array.isArray(x.options) && x.options.length >= 2 && x.options.every(o => typeof o === 'string')
    && Number.isInteger(x.correctIndex) && (x.correctIndex as number) >= 0 && (x.correctIndex as number) < x.options.length
    && typeof x.explanation === 'string' && !!x.explanation;
}

/** Deterministic last resort: mock data when the node matches, else a generic question. */
export function fallbackQuestions(p: GetQuestionsParams): BankQuestion[] {
  const n = p.count ?? 3;
  const label = p.label || p.nodeId;
  const mock = MOCK_DIAGNOSTIC_QUESTIONS.filter(
    m => m.target_node_id === p.nodeId && typeof m.correct_index === 'number'
  ).map((m, i) => ({
    id: `${p.nodeId}-${p.difficulty}-mock${i}`,
    question: m.question,
    options: m.options,
    correctIndex: m.correct_index as number,
    explanation: m.explanation || '',
    difficulty: p.difficulty,
    conceptTested: m.concept_tested,
  }));
  const id = p.language !== 'en';
  const generic: BankQuestion[] = Array.from({ length: n }, (_, i) => ({
    id: `${p.nodeId}-${p.difficulty}-gen${i}`,
    question: id
      ? `Pernyataan mana yang paling tepat menggambarkan inti dari "${label}"?`
      : `Which statement best describes the core idea of "${label}"?`,
    options: id
      ? [`Konsep inti dan tujuan ${label}`, 'Tidak berkaitan dengan topik ini', 'Hanya berlaku pada kasus khusus', 'Tidak memiliki prasyarat apa pun']
      : [`The core idea and purpose of ${label}`, 'Unrelated to this topic', 'Only applies to special cases', 'Has no prerequisites at all'],
    correctIndex: 0,
    explanation: id ? `Jawaban pertama merangkum inti ${label}.` : `The first option summarizes the core of ${label}.`,
    difficulty: p.difficulty,
    conceptTested: label,
  }));
  return [...mock, ...generic].slice(0, n);
}

function buildPrompt(p: GetQuestionsParams, per: number): { prompt: string; system: string } {
  const lang = p.language === 'en' ? 'English' : 'Bahasa Indonesia';
  const label = p.label || p.nodeId;
  return {
    system: `You write multiple-choice questions for a tutoring app. Output only valid JSON. Write in ${lang}. ${MATH_FORMAT_NOTE}`,
    prompt: `Topic: "${p.topic}". Concept: "${label}".
Write ${per} easy, ${per} medium and ${per} hard multiple-choice questions about this concept, in ${lang}.
easy = recall or recognize; medium = apply to a small case; hard = analyze, compare or find the flaw.
Each question has 4 options, one correct, and vary the correct position.
JSON: {"questions":[{"difficulty":"easy|medium|hard","question":"...","options":["..","..","..",".."],"correctIndex":0,"explanation":"why the answer is right","conceptTested":"..."}]}`,
  };
}

// In-process cache so a missing table (or several levels in one post-test) never costs extra AI calls
const memo = new Map<string, BankQuestion[]>();

export async function getQuestions(p: GetQuestionsParams): Promise<BankQuestion[]> {
  const count = p.count ?? 3;
  const { nodeId } = p;
  const topic = bankTopic(p.topic, p.language);
  let supabase: any = null;
  try {
    const { createClient } = await import('@/lib/supabase/server');
    supabase = await createClient();
  } catch { /* no cache available */ }

  const readCache = async (): Promise<BankQuestion[]> => {
    const mem = memo.get(`${topic}|${nodeId}|${p.difficulty}`) ?? [];
    if (!supabase) return mem;
    try {
      const { data, error } = await supabase.from('question_bank').select('question')
        .eq('topic', topic).eq('node_id', nodeId).eq('difficulty', p.difficulty).limit(50);
      if (error || !data) return mem;
      return data.map((r: any) => r.question).filter(validateQuestion)
        .map((q: any) => ({ ...q, difficulty: p.difficulty }));
    } catch { return mem; }
  };

  const cached = await readCache();
  if (cached.length >= count) return cached.slice(0, count);

  try {
    const { generateStructuredJSON } = await import('@/lib/ai/provider');
    const { prompt, system } = buildPrompt(p, Math.max(3, count));
    const res = await generateStructuredJSON<{ questions: any[] }>(prompt, system);
    const rows: { topic: string; node_id: string; difficulty: Difficulty; question: BankQuestion }[] = [];
    const stamp = Date.now().toString(36);
    (res?.questions ?? []).forEach((q, i) => {
      const difficulty: Difficulty = DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : 'medium';
      const withId = { ...q, id: `${nodeId}-${difficulty}-${stamp}${i}`, difficulty };
      if (validateQuestion(withId)) rows.push({ topic, node_id: nodeId, difficulty, question: withId as BankQuestion });
    });
    if (rows.length) {
      for (const r of rows) {
        const k = `${topic}|${nodeId}|${r.difficulty}`;
        memo.set(k, [...(memo.get(k) ?? []), r.question]);
      }
      if (supabase) {
        try { await supabase.from('question_bank').insert(rows); } catch { /* table missing: skip cache */ }
      }
      const mine = rows.filter(r => r.difficulty === p.difficulty).map(r => r.question);
      if (mine.length) return [...mine, ...fallbackQuestions({ ...p, count })].slice(0, count);
    }
  } catch (e) {
    console.warn('question-bank: AI unavailable, using fallback', e);
  }
  return [...cached, ...fallbackQuestions({ ...p, count })].slice(0, count);
}

/** Post-test: up to 10 items (3 easy, 4 medium, 3 hard). One AI call fills all levels. */
export async function getPostTest(p: Omit<GetQuestionsParams, 'difficulty' | 'count'>): Promise<BankQuestion[]> {
  const easy = await getQuestions({ ...p, difficulty: 'easy', count: 3 });
  const medium = await getQuestions({ ...p, difficulty: 'medium', count: 4 });
  const hard = await getQuestions({ ...p, difficulty: 'hard', count: 3 });
  return [...easy, ...medium, ...hard].slice(0, 10);
}
