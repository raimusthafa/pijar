// Client helpers for the workspace page.
import type { Phase, Lang } from './five-e';

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.code ?? 'error'), { code: data.code, status: res.status });
  return data as T;
}

export const openWorkspace = (graphId: string, nodeId: string) =>
  fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ graphId, nodeId }) })
    .then(r => json<{ workspace: { id: string; phase: Phase }; events: unknown[] }>(r));

export type SendInput = {
  kind: 'chat' | 'quiz' | 'image' | 'canvas'; text?: string; imageDataUrl?: string;
  quizAnswer?: { questionId: string; selected: number | string; correct: boolean };
  language: Lang; concept: { label: string; topic: string };
};

/** Returns {eventId, phase, chunks}: iterate `chunks` with for await to get streamed tutor text. */
export async function sendEvent(id: string, input: SendInput) {
  const res = await fetch(`/api/workspace/${id}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) await json(res);
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  async function* chunks() {
    for (;;) { const { done, value } = await reader.read(); if (done) return; yield value; }
  }
  return { eventId: res.headers.get('x-event-id') ?? '', phase: res.headers.get('x-phase') as Phase, chunks: chunks() };
}

export const advance = (id: string) =>
  fetch(`/api/workspace/${id}/advance`, { method: 'POST' }).then(r => json<{ phase: Phase; isLast: boolean; next?: 'post-test' }>(r));

/** Downsizes a canvas so the longest side is <= maxSide, returns a PNG data URL. */
export function canvasToDataUrl(canvas: HTMLCanvasElement, maxSide = 1024) {
  const k = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  if (k === 1) return canvas.toDataURL('image/png');
  const c = document.createElement('canvas');
  c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k);
  c.getContext('2d')!.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
