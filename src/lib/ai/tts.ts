import { createHash } from 'node:crypto';
import { speakable } from '../learn/math-text.ts';
import { nextPacificMidnight } from './provider.ts';

// ── Models & Voice Configuration ──────────────────────────────
export const TTS_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
] as const;

export const DEFAULT_VOICE = 'Kore';
export const TTS_SAMPLE_RATE = 24000;
export const TTS_TIMEOUT_MS = 25000;

export class TtsUnavailable extends Error {
  constructor(message = 'Gemini TTS is unavailable or quota exhausted') {
    super(message);
    this.name = 'TtsUnavailable';
  }
}

// Model exhaustion tracker: modelId -> blockedUntil epoch ms
export type TtsChainState = Map<string, number>;
export const ttsState: TtsChainState = new Map();

/**
 * Wraps raw 16-bit mono PCM bytes into a standard 44-byte WAV header.
 */
export function pcmToWav(
  pcm: Buffer,
  sampleRate = TTS_SAMPLE_RATE,
  numChannels = 1,
  bitsPerSample = 16,
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;

  // RIFF Chunk Descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

/**
 * Computes deterministic SHA-256 hash of normalized narration content.
 */
export function hashNarration(text: string, language: string, voice = DEFAULT_VOICE): string {
  const norm = text.trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(`${language}|${voice}|${norm}`).digest('hex');
}

export { distributeCaptions } from '../learn/captions.ts';

function ttsBlockedUntil(err: unknown, now: number): number {
  const e = err as { status?: number; code?: number; message?: string };
  const msg = String(e?.message ?? err);
  const status = e?.status ?? e?.code;
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
    if (/PerDay|per day/i.test(msg)) return nextPacificMidnight(now);
    const retry = /retry(?:Delay"?:\s*"|[^0-9]{1,20})(\d+(?:\.\d+)?)s/i.exec(msg);
    return now + (retry ? Math.ceil(Number(retry[1])) * 1000 : 65_000);
  }
  if (status === 404 || /NOT_FOUND|not supported/i.test(msg)) return now + 3_600_000;
  if (/timed out/i.test(msg)) return now + 120_000;
  return 0;
}

interface SynthesizeOptions {
  language?: 'id' | 'en';
  voice?: string;
  apiKey?: string;
  models?: readonly string[];
  state?: TtsChainState;
  now?: () => number;
}

export interface TtsResult {
  wav: Buffer;
  durationSeconds: number;
  model: string;
}

/**
 * Strips accidental prompt meta-instructions, labels, or narration artifacts
 * that may have leaked into generated narration text.
 */
export function sanitizeSpokenText(text: string): string {
  return text
    .replace(/^(\s*\[?(?:narasi|narration|voiceover|audio|instruksi|instruction)\]?\s*[:\-\u2013\u2014]\s*)/i, '')
    .replace(/^(\s*(?:bacakan|baca)\s+(?:sebagai|dengan|secara)[^:.\n]+[:.\n]\s*)/i, '')
    .replace(/^(\s*read\s+(?:as|with)[^:.\n]+[:.\n]\s*)/i, '')
    .trim();
}

/**
 * Synthesizes audio using Gemini TTS with automatic model failover and PCM-to-WAV wrapping.
 */
export async function synthesize(
  text: string,
  opts?: SynthesizeOptions,
): Promise<TtsResult> {
  const language = opts?.language ?? 'id';
  const voice = opts?.voice ?? DEFAULT_VOICE;
  const apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY;
  const models = opts?.models ?? TTS_MODELS;
  const st = opts?.state ?? ttsState;
  const now = opts?.now ?? Date.now;

  if (!apiKey) {
    throw new TtsUnavailable('GEMINI_API_KEY is not configured');
  }

  // 1. Pre-process text: convert formulas to natural words, strip markup, and clean prompt artifacts
  const cleanSpoken = sanitizeSpokenText(speakable(text, language).replace(/<[^>]*>/g, '').trim());
  if (!cleanSpoken) {
    throw new Error('Narration text is empty after preprocessing');
  }

  let lastError: unknown = new TtsUnavailable('All Gemini TTS models are currently exhausted');

  for (const modelId of models) {
    const blocked = st.get(modelId) ?? 0;
    if (blocked > now()) {
      continue;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: cleanSpoken }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!res.ok) {
        const errText = await res.text();
        const errObj = { status: res.status, message: errText };
        throw errObj;
      }

      const json = await res.json();
      const part = json.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (!inlineData?.data) {
        throw new Error(`Model ${modelId} did not return audio data in response`);
      }

      const rawBuffer = Buffer.from(inlineData.data, 'base64');
      const mimeType = String(inlineData.mimeType || '');

      let wav: Buffer;
      let durationSeconds: number;

      if (mimeType.toLowerCase().includes('wav') && rawBuffer.subarray(0, 4).toString() === 'RIFF') {
        wav = rawBuffer;
        durationSeconds = Math.max(0.1, (wav.length - 44) / (TTS_SAMPLE_RATE * 2));
      } else {
        // Raw PCM (e.g. audio/L16;codec=pcm;rate=24000)
        wav = pcmToWav(rawBuffer, TTS_SAMPLE_RATE);
        durationSeconds = Math.max(0.1, rawBuffer.length / (TTS_SAMPLE_RATE * 2));
      }

      return {
        wav,
        durationSeconds: Number(durationSeconds.toFixed(2)),
        model: modelId,
      };
    } catch (err) {
      lastError = err;
      const until = ttsBlockedUntil(err, now());
      if (until) {
        st.set(modelId, until);
      }
    }
  }

  throw lastError instanceof TtsUnavailable ? lastError : new TtsUnavailable(String(lastError));
}
