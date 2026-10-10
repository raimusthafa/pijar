import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

// ── Provider Configuration ────────────────────────────────────
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'gemini';
const DEMO_MODE   = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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

// ================================================================
// generateStructuredJSON<T>
// Memanggil LLM dan memaksa output berupa JSON valid.
// ================================================================
export async function generateStructuredJSON<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  if (DEMO_MODE) {
    throw new Error('DEMO_MODE_ACTIVE'); // Tangkap di caller, gunakan mock data
  }

  if (AI_PROVIDER === 'gemini') {
    return generateWithGemini<T>(prompt, systemInstruction);
  } else {
    return generateWithOpenAI<T>(prompt, systemInstruction);
  }
}

// ── Gemini Implementation ─────────────────────────────────────
async function generateWithGemini<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  const text = response.text ?? '';
  return JSON.parse(text) as T;
}

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
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<string>> {
  if (AI_PROVIDER === 'gemini') {
    return streamWithGemini(messages, systemPrompt);
  } else {
    return streamWithOpenAI(messages, systemPrompt);
  }
}

async function streamWithGemini(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<string>> {
  const client = getGeminiClient();
  const lastMessage = messages[messages.length - 1].content;

  const response = await client.models.generateContentStream({
    model: 'gemini-1.5-flash',
    contents: lastMessage,
    config: { systemInstruction: systemPrompt },
  });

  return new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.text ?? '';
        if (text) controller.enqueue(text);
      }
      controller.close();
    },
  });
}

async function streamWithOpenAI(
  messages: { role: 'user' | 'assistant'; content: string }[],
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
