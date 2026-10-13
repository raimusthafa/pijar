// Pure helpers for workspace evidence (photos / canvas) and model history.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_TEXT = 2000;

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;

export function parseImageDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_IMAGE_BYTES * 1.4 + 100) return null;
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m || m[2].length % 4 !== 0) return null;
  const mimeType = m[1] as keyof typeof EXT;
  const base64 = m[2];
  const pad = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = (base64.length / 4) * 3 - pad;
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) return null;
  return { mimeType, base64, bytes, ext: EXT[mimeType] };
}

export type EventLike = { kind: string; role: string; content: string };

/** Last `limit` chat-relevant events as model messages; always starts with a user turn. */
export function buildHistory(events: EventLike[], limit = 12) {
  const msgs = events
    .filter(e => e.kind !== 'phase' && (e.role === 'user' || e.role === 'assistant'))
    .slice(-limit)
    .map(e => ({ role: e.role as 'user' | 'assistant', content: e.content }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}
