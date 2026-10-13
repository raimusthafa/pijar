// Gemini free-tier chain, best first. Limits read from AI Studio on 2026-10-13.
// json/system = verified support for responseMimeType JSON / systemInstruction through the Gemini API.
// gemini-2.5-pro has limit 0 on the free tier: never add it.
export type ModelInfo = { id: string; rpd: number; json: boolean; system: boolean; notes: string };

const G = { json: true, system: true };
const GEMMA = { json: true, system: false }; // verified 2026-10-13: systemInstruction -> HTTP 500, JSON mime ok

export const MODELS: readonly ModelInfo[] = [
  { id: 'gemini-3.8-flash', rpd: 20, ...G, notes: '5 RPM' },
  { id: 'gemini-3.7-flash', rpd: 20, ...G, notes: '5 RPM' },
  { id: 'gemini-3.6-flash', rpd: 20, ...G, notes: '5 RPM' },
  { id: 'gemini-3-flash-preview', rpd: 20, ...G, notes: '5 RPM' },
  { id: 'gemini-3.5-flash-lite', rpd: 500, ...G, notes: '15 RPM' },
  { id: 'gemini-3.1-flash-lite', rpd: 500, ...G, notes: '15 RPM' },
  { id: 'gemini-2.5-flash', rpd: 20, ...G, notes: '5 RPM' },
  { id: 'gemma-4-31b-it', rpd: 14400, ...GEMMA, notes: '30 RPM, 16K TPM' },
  { id: 'gemma-4-26b-a4b-it', rpd: 14400, ...GEMMA, notes: '30 RPM, 16K TPM' },
  { id: 'gemini-2.5-flash-lite', rpd: 20, ...G, notes: '10 RPM' },
];
