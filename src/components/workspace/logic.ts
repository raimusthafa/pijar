// Pure helpers for the workspace UI (kept free of React so node --test can run them).
import { PHASES, type Phase } from '../../lib/workspace/five-e.ts';

/** Size that fits inside maxSide on the longest edge, never upscaled. */
export function fitSize(w: number, h: number, maxSide = 1024) {
  const k = Math.min(1, maxSide / Math.max(w, h, 1));
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** True when the scroller is within `slack` px of its end (auto-scroll only then). */
export function nearBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }, slack = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= slack;
}

export const phaseIndex = (p: Phase) => PHASES.indexOf(p);

/** Map an API error code to a message key suffix under `workspace.err.`. */
export function errKey(code?: string) {
  return code === 'invalid_image' || code === 'upload_failed' || code === 'migration_missing' ? code : 'generic';
}

export const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
