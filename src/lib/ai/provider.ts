import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { MODELS, type ModelInfo } from './models.ts';

// ── Provider Configuration ────────────────────────────────────
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'gemini';
const DEMO_MODE   = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export type AiImage = { mimeType: string; base64: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ── Client Instances (lazy) ───────────────────────────────────
let geminiClient: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return geminiClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return openaiClient;
}

function hasOpenAI(): boolean {
  const k = process.env.OPENAI_API_KEY;
  return !!k && !k.includes('placeholder');
}

// ── Model chain: walk the ranked list, skip exhausted models ──
export type ChainState = Map<string, number>; // modelId -> exhausted until (ms epoch)
const state: ChainState = new Map();

/** Ranked list, with GEMINI_MODEL (if set) moved to the front. */
function chain(): ModelInfo[] {
  const first = process.env.GEMINI_MODEL;
  if (!first) return [...MODELS];
  const known = MODELS.find((m) => m.id === first) ?? { id: first, rpd: 0, json: true, system: true, notes: 'env' };
  return [known, ...MODELS.filter((m) => m.id !== first)];
}

/** Next 00:00 America/Los_Angeles after `now` (ignores the DST-change hour). */
export function nextPacificMidnight(now: number): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(now);
  const n = (t: string) => Number(p.find((x) => x.type === t)!.value);
  const secs = n('hour') * 3600 + n('minute') * 60 + n('second');
  return now - (now % 1000) + (86400 - secs) * 1000;
}

/** How long (until ms epoch) a failed model should be skipped; 0 = do not mark. */
function blockedUntil(err: unknown, now: number): number {
  const e = err as { status?: number; code?: number; message?: string };
  const msg = String(e?.message ?? err);
  const status = e?.status ?? e?.code;
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
    if (/PerDay|per day/i.test(msg)) return nextPacificMidnight(now);
    const retry = /retry(?:Delay"?:\s*"|[^0-9]{1,20})(\d+(?:\.\d+)?)s/i.exec(msg);
    return now + (retry ? Math.ceil(Number(retry[1])) * 1000 : 65_000);
  }
  if (status === 404 || /NOT_FOUND|not supported/i.test(msg)) return now + 3_600_000;
  return 0;
}

/** Try `call` on each non-exhausted model in order; return the first success, else throw the last error. */
export async function runChain<R>(
  models: string[],
  call: (id: string) => Promise<R>,
  st: ChainState = state,
  now: () => number = Date.now,
): Promise<R> {
  let last: unknown = new Error('No AI model available (all exhausted)');
  const start = now();
  for (const id of models) {
    if ((st.get(id) ?? 0) > now()) continue;
    if (now() - start > CHAIN_BUDGET_MS) break;
    try {
      return await withTimeout(call(id), MODEL_TIMEOUT_MS);
    } catch (err) {
      last = err;
      const until = blockedUntil(err, now());
      if (until) st.set(id, until);
    }
  }
  throw last;
}

// A hung model must not hold the whole chain: give each model a slice and the walk a total budget.
const MODEL_TIMEOUT_MS = Number(process.env.AI_MODEL_TIMEOUT_MS ?? 20_000);
const CHAIN_BUDGET_MS = Number(process.env.AI_CHAIN_BUDGET_MS ?? 45_000);

function withTimeout<R>(p: Promise<R>, ms: number): Promise<R> {
  let t: ReturnType<typeof setTimeout>;
  const timer = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`AI model timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timer]).finally(() => clearTimeout(t));
}

/** For debugging: every model with its exhausted-until (ISO string or null). */
export function modelStatus(now: number = Date.now()) {
  return chain().map((m) => {
    const until = state.get(m.id) ?? 0;
    return { id: m.id, exhaustedUntil: until > now ? new Date(until).toISOString() : null };
  });
}

/** Parse JSON from model text: plain, ```fenced```, or the first {...} / [...] block. */
export function extractJSON<T>(text: string): T {
  const t = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(t) as T;
  } catch {
    const m = /[{[]/.exec(t);
    if (!m) throw new SyntaxError('No JSON in model output');
    const close = m[0] === '{' ? '}' : ']';
    return JSON.parse(t.slice(m.index, t.lastIndexOf(close) + 1)) as T;
  }
}

const JSON_ONLY = '\n\nRespond with ONLY valid JSON, no prose, no code fences.';

function byId(id: string): ModelInfo {
  return chain().find((m) => m.id === id)!;
}

// ================================================================
// generateStructuredJSON<T>
// Memanggil LLM dan memaksa output berupa JSON valid.
// ================================================================
export async function generateStructuredJSON<T>(
  prompt: string,
  systemInstruction?: string,
  images?: AiImage[],
): Promise<T> {
  if (DEMO_MODE) {
    throw new Error('DEMO_MODE_ACTIVE'); // Tangkap di caller, gunakan mock data
  }
  if (AI_PROVIDER !== 'gemini') return generateWithOpenAI<T>(prompt, systemInstruction);

  try {
    return await runChain(chain().map((m) => m.id), (id) => generateWithGemini<T>(byId(id), prompt, systemInstruction, images));
  } catch (geminiErr) {
    if (hasOpenAI()) {
      console.warn('Gemini chain exhausted, failover to OpenAI:', (geminiErr as Error).message?.slice(0, 200));
      return await generateWithOpenAI<T>(prompt, systemInstruction);
    }
    throw geminiErr;
  }
}

// ── Gemini Implementation ─────────────────────────────────────
async function generateWithGemini<T>(
  m: ModelInfo,
  prompt: string,
  systemInstruction?: string,
  images: AiImage[] = [],
): Promise<T> {
  const folded = !m.system && systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  const text = m.json ? folded : folded + JSON_ONLY;
  const response = await getGeminiClient().models.generateContent({
    model: m.id,
    contents: [{ role: 'user', parts: [{ text }, ...images.map(toPart)] }],
    config: {
      systemInstruction: m.system ? systemInstruction : undefined,
      responseMimeType: m.json ? 'application/json' : undefined,
      temperature: 0.4,
    },
  });
  return extractJSON<T>(response.text ?? '');
}

const toPart = (i: AiImage) => ({ inlineData: { mimeType: i.mimeType, data: i.base64 } });

// ── OpenAI Implementation ─────────────────────────────────────
async function generateWithOpenAI<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const client = getOpenAIClient();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const text = response.choices[0].message.content ?? '{}';
  return JSON.parse(text) as T;
}

// ================================================================
// streamChat
// Streaming chat untuk AI Tutor (F6)
// Returns: ReadableStream<string>
// ================================================================
export async function streamChatResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  images?: AiImage[],
): Promise<ReadableStream<string>> {
  if (AI_PROVIDER !== 'gemini') return streamWithOpenAI(messages, systemPrompt);

  try {
    return await runChain(chain().map((m) => m.id), (id) => streamWithGemini(byId(id), messages, systemPrompt, images));
  } catch (geminiErr) {
    if (hasOpenAI()) {
      console.warn('Gemini chain exhausted, stream failover to OpenAI:', (geminiErr as Error).message?.slice(0, 200));
      return streamWithOpenAI(messages, systemPrompt);
    }
    throw geminiErr;
  }
}

// Peeks the first chunk so a failure before any output falls through to the next model.
async function streamWithGemini(
  m: ModelInfo,
  messages: ChatMessage[],
  systemPrompt: string,
  images: AiImage[] = [],
): Promise<ReadableStream<string>> {
  const contents = messages.map((msg, i) => {
    const text = !m.system && i === 0 ? `${systemPrompt}\n\n${msg.content}` : msg.content;
    const parts: object[] = [{ text }];
    if (i === messages.length - 1 && msg.role === 'user') parts.push(...images.map(toPart));
    return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
  });

  const response = await getGeminiClient().models.generateContentStream({
    model: m.id,
    contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
    config: { systemInstruction: m.system ? systemPrompt : undefined },
  });

  const it = response[Symbol.asyncIterator]();
  let first = await it.next();
  while (!first.done && !first.value.text) first = await it.next();

  return new ReadableStream<string>({
    async start(controller) {
      let cur = first;
      while (!cur.done) {
        const text = cur.value.text ?? '';
        if (text) controller.enqueue(text);
        cur = await it.next();
      }
      controller.close();
    },
  });
}

async function streamWithOpenAI(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ReadableStream<string>> {
  const client = getOpenAIClient();

  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  });

  return new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(text);
      }
      controller.close();
    },
  });
}
