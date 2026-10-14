/* eslint-disable @typescript-eslint/no-explicit-any -- AI JSON and the Supabase client are untyped here on purpose */
// ================================================================
// PIJAR - Question bank (cache first, one AI call for many questions)
// Order: question_bank table -> AI (3 easy + 3 medium + 3 hard per call) -> mock/generic.
// The AI free tier is tiny, so a call fills ALL difficulties and caches them.
// Heavy imports are dynamic so the pure parts can run under node --test.
// ================================================================

import { MOCK_DIAGNOSTIC_QUESTIONS } from '../ai/mock-data.ts';
import { MATH_FORMAT_NOTE } from './math-text.ts';
import { compileExpr } from './math-spec.ts';

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

// ── Quality gate: the AI writes the key, so check what can be checked before a learner is graded on it ──

/** Options compared as math: case, spaces, $ and LaTeX spacing do not make two options different. */
const normOpt = (s: string) => s.toLowerCase()
  .replace(/\\(?:left|right|displaystyle)|\\[,;:! ]/g, '').replace(/\\(?:times|cdot)/g, '*').replace(/[$\s{}]/g, '').replace(/−/g, '-');
const tokens = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

/** Token Jaccard of two stems, 0..1. */
export function stemSimilarity(a: string, b: string): number {
  const x = tokens(a), y = tokens(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const t of x) if (y.has(t)) both++;
  return both / (x.size + y.size - both);
}

const MAX_SIMILARITY = 0.8;

/** "3x5" for 3x^5: a short option with a letter straight followed by a digit, inside a set that otherwise uses LaTeX. */
function malformedExponent(options: string[]): boolean {
  if (!options.some(o => /[$\\^]/.test(o))) return false;
  return options.some(o => {
    const bare = o.replace(/\$/g, '').trim();
    return bare.length <= 24 && !/[A-Za-z]{3,}/.test(bare.replace(/\\[a-zA-Z]+/g, '')) && /(?<![A-Za-z\\_])[a-z]\d/.test(bare);
  });
}

/** A stem that is one plain arithmetic expression (digits and + - * / ^ only) and a numeric key: false on a clear mismatch. */
function arithmeticAgrees(q: { question: string; options: string[]; correctIndex: number }): boolean {
  const stem = q.question.replace(/\$/g, '').replace(/\\(?:times|cdot)/g, '*').replace(/\\div/g, '/').replace(/[×·]/g, '*').replace(/÷/g, '/')
    .replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/−/g, '-');
  const cands = (stem.match(/\d[\d\s.+\-*/^()]*[\d)]/g) ?? []).map(c => c.trim()).filter(c => /[+\-*/^]/.test(c));
  if (cands.length !== 1) return true;
  // Every digit in the stem must belong to the expression, else it is a word problem we cannot read safely.
  if ((stem.match(/\d/g) ?? []).length !== (cands[0].match(/\d/g) ?? []).length) return true;
  const key = normOpt(q.options[q.correctIndex]);
  if (!/^-?\d+(\.\d+)?$/.test(key)) return true;
  const value = compileExpr(cands[0])?.(0);
  if (typeof value !== 'number' || !Number.isFinite(value)) return true;
  return Math.abs(value - Number(key)) <= 1e-6 * Math.max(1, Math.abs(value));
}

/** Why a question cannot be used, or null when it is fine. Shape first, then content. */
export function questionProblem(q: unknown): string | null {
  if (!validateQuestion(q)) return 'shape';
  const { question, options, correctIndex, explanation } = q;
  if (options.length < 3 || options.length > 5) return 'option count';
  if (options.some(o => !o.trim())) return 'empty option';
  const norm = options.map(normOpt);
  if (new Set(norm).size !== norm.length) return 'duplicate options';
  if (!explanation.trim()) return 'no explanation';
  // The explanation must not argue for a different option (only checked when the option text is long enough to find).
  const exp = normOpt(explanation);
  const key = norm[correctIndex];
  if (!exp.includes(key) && norm.some((o, i) => i !== correctIndex && o.length >= 3 && !key.includes(o) && exp.includes(o))) {
    return 'explanation supports another option';
  }
  if (malformedExponent(options)) return 'malformed exponent';
  if (!arithmeticAgrees({ question, options, correctIndex })) return 'key contradicts arithmetic';
  return question.trim().length < 5 ? 'empty stem' : null;
}

/** Keeps the good questions, in order, and drops a stem that nearly repeats one already kept (or in `existing`). */
export function acceptQuestions<T extends { question: string }>(candidates: T[], existing: { question: string }[] = []): T[] {
  const kept: { question: string }[] = [...existing];
  const out: T[] = [];
  for (const c of candidates) {
    if (questionProblem(c) || kept.some(k => stemSimilarity(k.question, c.question) > MAX_SIMILARITY)) continue;
    kept.push(c);
    out.push(c);
  }
  return out;
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
  const generic: BankQuestion[] = Array.from({ length: n }, (_, i) => {
    const [right, ...wrong] = id
      ? [`Konsep inti dan tujuan ${label}`, 'Tidak berkaitan dengan topik ini', 'Hanya berlaku pada kasus khusus', 'Tidak memiliki prasyarat apa pun']
      : [`The core idea and purpose of ${label}`, 'Unrelated to this topic', 'Only applies to special cases', 'Has no prerequisites at all'];
    // Spread the right answer over 1-4 so the last-resort set cannot be passed by always picking option 1.
    const at = (i + p.nodeId.length + DIFFICULTIES.indexOf(p.difficulty)) % 4;
    return {
      id: `${p.nodeId}-${p.difficulty}-gen${i}`,
      question: id
        ? `Pernyataan mana yang paling tepat menggambarkan inti dari "${label}"?`
        : `Which statement best describes the core idea of "${label}"?`,
      options: [...wrong.slice(0, at), right, ...wrong.slice(at)],
      correctIndex: at,
      explanation: id ? `Pernyataan "${right}" merangkum inti ${label}.` : `"${right}" summarizes the core of ${label}.`,
      difficulty: p.difficulty,
      conceptTested: label,
    };
  });
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
Rules: each question has 4 options with exactly ONE correct answer, and the correct position varies. Distractors must be plausible and distinct (never the same value written twice). Solve each question yourself first and key the option you actually computed; the explanation must show that working and quote the correct option's text. No two questions may test the same item with reworded or reordered numbers. Stay on this concept only. Math goes in LaTeX inside $...$ with exponents written as ^{} (for example $3x^{5}$, never 3x5).
JSON: {"questions":[{"difficulty":"easy|medium|hard","question":"...","options":["..","..","..",".."],"correctIndex":0,"explanation":"why the answer is right","conceptTested":"..."}]}`,
  };
}

// In-process cache so a missing table (or several levels in one post-test) never costs extra AI calls
const memo = new Map<string, BankQuestion[]>();

/** The post-test is served by one request and graded by another, so both must pick the same questions: sort by id, never by arrival order. */
const pick = (list: BankQuestion[], count: number) => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, count);

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
      // Rows saved before the quality gate may be bad: they stop matching here, nothing is deleted.
      return acceptQuestions(pick(data.map((r: any) => r.question).filter(validateQuestion)
        .map((q: any) => ({ ...q, difficulty: p.difficulty })), 50));
    } catch { return mem; }
  };

  const cached = await readCache();
  if (cached.length >= count) return pick(cached, count);

  // One generation, plus ONE extra only when dropped questions left us short.
  let have = cached;
  try {
    const { generateStructuredJSON } = await import('@/lib/ai/provider');
    for (let round = 0; round < 2 && have.length < count; round++) {
      const { prompt, system } = buildPrompt(p, Math.max(3, count));
      const raw = await generateStructuredJSON<{ questions: any[] } | any[]>(prompt, system);
      // Some models return the bare array instead of {questions: [...]}.
      const list: any[] = (Array.isArray(raw) ? raw : raw?.questions) ?? [];
      const stamp = `${Date.now().toString(36)}${round}`;
      const good = acceptQuestions(list.map((q, i) => {
        const difficulty: Difficulty = DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : 'medium';
        return { ...q, id: `${nodeId}-${difficulty}-${stamp}${i}`, difficulty } as BankQuestion;
      }), have);
      if (!good.length) continue;
      for (const q of good) {
        const k = `${topic}|${nodeId}|${q.difficulty}`;
        memo.set(k, [...(memo.get(k) ?? []), q]);
      }
      if (supabase) {
        try { await supabase.from('question_bank').insert(good.map(q => ({ topic, node_id: nodeId, difficulty: q.difficulty, question: q }))); } catch { /* table missing: skip cache */ }
      }
      have = [...have, ...good.filter(q => q.difficulty === p.difficulty)];
    }
    if (have.length > cached.length) return [...pick(have, count), ...fallbackQuestions({ ...p, count })].slice(0, count);
  } catch (e) {
    console.warn('question-bank: AI unavailable, using fallback', e);
  }
  return [...have, ...fallbackQuestions({ ...p, count })].slice(0, count);
}

/** Post-test: up to 10 items (3 easy, 4 medium, 3 hard). One AI call fills all levels. */
export async function getPostTest(p: Omit<GetQuestionsParams, 'difficulty' | 'count'>): Promise<BankQuestion[]> {
  // Medium first: it asks for 4 per level, so the one AI call also covers easy and hard.
  const medium = await getQuestions({ ...p, difficulty: 'medium', count: 4 });
  const easy = await getQuestions({ ...p, difficulty: 'easy', count: 3 });
  const hard = await getQuestions({ ...p, difficulty: 'hard', count: 3 });
  return [...easy, ...medium, ...hard].slice(0, 10);
}
