// ================================================================
// PIJAR - Scene DSL for the explainer video (data only, never code)
// The AI (or a recipe) emits JSON. This file validates it strictly:
// caps on counts and durations, unique ids, a color allow-list, plain
// strings only (no HTML), formulas only through compileExpr. Invalid
// pieces are dropped; a lesson never fails because of a bad scene.
// The renderer (src/components/learn/video) maps this to manim-web.
// ================================================================

import { compileExpr } from './math-spec.ts';

// ── Contract ──────────────────────────────────────────────────────

export const STAGE_COLORS = ['ink', 'amber', 'off-white', 'muted', 'success', 'danger'] as const;
export type StageColor = (typeof STAGE_COLORS)[number];

/** [x, y] in stage units: x from -6.5 to 6.5 (left to right), y from -3.4 to 3.4 (bottom to top). */
export type Pt = [number, number];
/** [min, max, step] */
export type Range3 = [number, number, number];
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';

interface Base {
  id: string;
}

export type StageObject =
  | (Base & { type: 'text'; text: string; at: Pt; size?: TextSize; color?: StageColor; align?: 'left' | 'center' | 'right'; mono?: boolean; /** low: a side note, moved under the stage on narrow screens. */ priority?: 'low' })
  | (Base & { type: 'mathtex'; latex: string; at: Pt; size?: TextSize; color?: StageColor; priority?: 'low' })
  | (Base & { type: 'axes'; at: Pt; size: [number, number]; xRange: Range3; yRange: Range3; xLabel?: string; yLabel?: string; numbers?: boolean; color?: StageColor })
  | (Base & { type: 'function-graph'; axes: string; expr: string; color?: StageColor; xRange?: [number, number]; /** Plot the slope of expr instead of expr itself. */ derivative?: boolean })
  | (Base & { type: 'vector'; from: Pt | string; to: Pt | string; axes?: string; color?: StageColor })
  | (Base & { type: 'dot'; at?: Pt; axes?: string; onGraph?: { graph: string; x: number }; color?: StageColor; radius?: number; hollow?: boolean })
  | (Base & { type: 'line'; from: Pt | string; to: Pt | string; axes?: string; color?: StageColor; dashed?: boolean })
  | (Base & { type: 'circle'; at: Pt; radius: number; color?: StageColor; fill?: boolean })
  | (Base & { type: 'rectangle'; at: Pt; size: [number, number]; color?: StageColor; fill?: boolean })
  | (Base & { type: 'polygon'; points: Pt[]; color?: StageColor; fill?: boolean })
  | (Base & { type: 'number-line'; at: Pt; length: number; range: Range3; color?: StageColor; numbers?: boolean })
  | (Base & { type: 'brace'; from: Pt; to: Pt; label?: string; color?: StageColor })
  | (Base & { type: 'box'; at: Pt; size?: [number, number]; label: string; sub?: string; color?: StageColor; fill?: boolean; round?: boolean })
  | (Base & { type: 'tangent'; graph: string; x: number; length?: number; color?: StageColor; dot?: boolean })
  | (Base & { type: 'area'; graph: string; range: [number, number]; color?: StageColor })
  | (Base & { type: 'riemann'; graph: string; range: [number, number]; n: number; color?: StageColor })
  | (Base & { type: 'grid'; at: Pt; extent: number; color?: StageColor })
  | (Base & { type: 'group'; children: string[] });

export type StageObjectType = StageObject['type'];

export const STAGE_ACTIONS = [
  'write', 'create', 'fade-in', 'fade-out', 'transform', 'move-to', 'indicate', 'grow-arrow',
  'draw-graph', 'trace-tangent', 'highlight', 'move-along', 'orbit', 'apply-matrix',
] as const;
export type StageAction = (typeof STAGE_ACTIONS)[number];

export interface TimelineEntry {
  /** Seconds from the start of the scene. */
  at: number;
  /** Seconds. */
  dur: number;
  do: StageAction;
  /** One id or several (a group id expands to its children). */
  target: string[];
  /** transform: id of the object to become. */
  to?: string;
  /** move-to: stage point. */
  point?: Pt;
  /** move-along and trace-tangent: x on the graph. */
  fromX?: number;
  toX?: number;
  /** orbit: center, radius and angles in degrees. */
  center?: Pt;
  radius?: number;
  fromDeg?: number;
  toDeg?: number;
  /** apply-matrix: [a, b, c, d] = x' = a x + c y, y' = b x + d y, about `center` (default the middle of the stage). */
  matrix?: [number, number, number, number];
  /** highlight: color to switch to. */
  color?: StageColor;
  /** Linear instead of eased (for synchronized traces). */
  linear?: boolean;
}

export interface StageSpec {
  objects: StageObject[];
  timeline: TimelineEntry[];
}

export interface RecipeRef {
  name: string;
  params?: Record<string, unknown>;
}

export const LIMITS = {
  objects: 40,
  timeline: 70,
  entryDur: 10,
  sceneMin: 6,
  sceneMax: 30,
  text: 120,
  label: 40,
  latex: 160,
  polygonPoints: 12,
  groupChildren: 24,
  targets: 24,
  riemannN: 60,
} as const;

// Stage coordinate frame (matches the 16:9 manim frame the engine sets up).
export const STAGE_W = 14;
export const STAGE_H = 7.875;
const X_MAX = 6.9;
const Y_MAX = 3.8;

// ── Small guards ──────────────────────────────────────────────────

type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,23}$/;
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** Plain text only (drawn on a canvas or escaped by React, never parsed as HTML). Control characters are removed, length is capped. */
export function cleanText(v: unknown, max: number = LIMITS.text, keepIndent = false): string | null {
  if (typeof v !== 'string') return null;
  const clean = v.replace(CONTROL_RE, '');
  const s = keepIndent ? clean.trimEnd() : clean.trim();
  return s.trim() ? s.slice(0, max) : null;
}

// Macros that read files, make links, run raw HTML or redefine the language.
const BAD_TEX = /\\(?:href|url|html\w*|input|include\w*|write\w*|read|open\w*|def|edef|gdef|xdef|let|newcommand|renewcommand|providecommand|csname|catcode|style|class|cssId|mathbf\{\s*\\href|toks\w*|loop|immediate|verb\w*|special|pdf\w*|unicode)\b/i;

export function cleanLatex(v: unknown): string | null {
  const s = cleanText(v, LIMITS.latex);
  if (!s || BAD_TEX.test(s)) return null;
  // Balanced braces keep the typesetter from running away.
  let depth = 0;
  for (const ch of s.replace(/\\[{}]/g, '')) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return null;
  }
  return depth === 0 ? s : null;
}

function pt(v: unknown, bound: number = 50): Pt | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const a = num(v[0]);
  const b = num(v[1]);
  return a === null || b === null ? null : [clamp(a, -bound, bound), clamp(b, -bound, bound)];
}

/** Stage point clamped to the visible frame. */
function stagePt(v: unknown): Pt | null {
  const p = pt(v);
  return p ? [clamp(p[0], -X_MAX, X_MAX), clamp(p[1], -Y_MAX, Y_MAX)] : null;
}

function range3(v: unknown): Range3 | null {
  if (!Array.isArray(v) || (v.length !== 2 && v.length !== 3)) return null;
  const a = num(v[0]);
  const b = num(v[1]);
  if (a === null || b === null) return null;
  const lo = clamp(a, -1000, 1000);
  const hi = clamp(b, -1000, 1000);
  if (!(lo < hi)) return null;
  const rawStep = v.length === 3 ? num(v[2]) : null;
  const step = rawStep && rawStep > 0 ? rawStep : (hi - lo) / 5;
  // No more than 40 ticks.
  return [lo, hi, Math.max(step, (hi - lo) / 40)];
}

function color(v: unknown): StageColor | undefined {
  return typeof v === 'string' && (STAGE_COLORS as readonly string[]).includes(v) ? (v as StageColor) : undefined;
}
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const sizeOf = (v: unknown): TextSize | undefined => (v === 'sm' || v === 'md' || v === 'lg' || v === 'xl' ? v : undefined);
const dropUndef = <T extends object>(o: T): T => {
  for (const k of Object.keys(o)) if ((o as Rec)[k] === undefined) delete (o as Rec)[k];
  return o;
};

// ── Object validation ─────────────────────────────────────────────

/**
 * Validate one object. `known` maps already accepted ids to their type so references
 * (axes, graph, dot ids) can be checked. Returns null when the object is unusable.
 */
function validateObject(raw: unknown, known: Map<string, StageObjectType>): StageObject | null {
  if (!isObj(raw)) return null;
  const id = typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;
  if (!id || known.has(id)) return null;
  const type = raw.type;
  const col = color(raw.color);
  const isType = (ref: unknown, t: StageObjectType) => typeof ref === 'string' && known.get(ref) === t;

  switch (type) {
    case 'text': {
      const text = cleanText(raw.text, LIMITS.text, raw.mono === true); // code keeps its indentation
      const at = stagePt(raw.at);
      if (!text || !at) return null;
      const align: 'left' | 'right' | 'center' | undefined = raw.align === 'left' || raw.align === 'right' || raw.align === 'center' ? raw.align : undefined;
      return dropUndef({ id, type, text, at, size: sizeOf(raw.size), color: col, align, mono: bool(raw.mono), priority: raw.priority === 'low' ? ('low' as const) : undefined });
    }
    case 'mathtex': {
      const latex = cleanLatex(raw.latex);
      const at = stagePt(raw.at);
      if (!latex || !at) return null;
      return dropUndef({ id, type, latex, at, size: sizeOf(raw.size), color: col, priority: raw.priority === 'low' ? ('low' as const) : undefined });
    }
    case 'axes': {
      const at = stagePt(raw.at);
      const xRange = range3(raw.xRange);
      const yRange = range3(raw.yRange);
      const s = Array.isArray(raw.size) && raw.size.length === 2 ? [num(raw.size[0]), num(raw.size[1])] : null;
      if (!at || !xRange || !yRange || !s || s[0] === null || s[1] === null) return null;
      return dropUndef({
        id, type, at, size: [clamp(s[0], 1, 13), clamp(s[1], 1, 7)] as [number, number], xRange, yRange,
        xLabel: cleanText(raw.xLabel, LIMITS.label) ?? undefined,
        yLabel: cleanText(raw.yLabel, LIMITS.label) ?? undefined,
        numbers: bool(raw.numbers), color: col,
      });
    }
    case 'function-graph': {
      if (!isType(raw.axes, 'axes') || !compileExpr(raw.expr)) return null;
      const xr = Array.isArray(raw.xRange) && raw.xRange.length === 2 ? [num(raw.xRange[0]), num(raw.xRange[1])] : null;
      const xRange = xr && xr[0] !== null && xr[1] !== null && xr[0] < xr[1] ? ([xr[0], xr[1]] as [number, number]) : undefined;
      return dropUndef({ id, type, axes: raw.axes as string, expr: (raw.expr as string).trim(), color: col, xRange, derivative: bool(raw.derivative) });
    }
    case 'vector': {
      const axes = isType(raw.axes, 'axes') ? (raw.axes as string) : undefined;
      const ends = [raw.from, raw.to].map((e) =>
        typeof e === 'string' ? (known.get(e) === 'dot' ? e : null) : axes ? pt(e, 1000) : stagePt(e),
      );
      if (!ends[0] || !ends[1]) return null;
      return dropUndef({ id, type, from: ends[0], to: ends[1], axes, color: col });
    }
    case 'line': {
      const axes = isType(raw.axes, 'axes') ? (raw.axes as string) : undefined;
      const ends = [raw.from, raw.to].map((e) =>
        typeof e === 'string' ? (known.get(e) === 'dot' ? e : null) : axes ? pt(e, 1000) : stagePt(e),
      );
      if (!ends[0] || !ends[1]) return null;
      return dropUndef({ id, type, from: ends[0], to: ends[1], axes, color: col, dashed: bool(raw.dashed) });
    }
    case 'dot': {
      const axes = isType(raw.axes, 'axes') ? (raw.axes as string) : undefined;
      let onGraph: { graph: string; x: number } | undefined;
      if (isObj(raw.onGraph) && isType(raw.onGraph.graph, 'function-graph') && num(raw.onGraph.x) !== null) {
        onGraph = { graph: raw.onGraph.graph as string, x: num(raw.onGraph.x)! };
      }
      const at = axes ? pt(raw.at, 1000) : stagePt(raw.at);
      if (!onGraph && !at) return null;
      const radius = num(raw.radius);
      return dropUndef({ id, type, at: at ?? undefined, axes, onGraph, color: col, radius: radius === null ? undefined : clamp(radius, 0.04, 0.4), hollow: bool(raw.hollow) });
    }
    case 'circle': {
      const at = stagePt(raw.at);
      const r = num(raw.radius);
      if (!at || r === null || r <= 0) return null;
      return dropUndef({ id, type, at, radius: clamp(r, 0.05, 6), color: col, fill: bool(raw.fill) });
    }
    case 'rectangle': {
      const at = stagePt(raw.at);
      const s = Array.isArray(raw.size) && raw.size.length === 2 ? [num(raw.size[0]), num(raw.size[1])] : null;
      if (!at || !s || s[0] === null || s[1] === null || s[0] <= 0 || s[1] <= 0) return null;
      return dropUndef({ id, type, at, size: [clamp(s[0], 0.05, 13), clamp(s[1], 0.05, 7)] as [number, number], color: col, fill: bool(raw.fill) });
    }
    case 'polygon': {
      if (!Array.isArray(raw.points)) return null;
      const points = raw.points.slice(0, LIMITS.polygonPoints).map(stagePt).filter((p): p is Pt => !!p);
      if (points.length < 3) return null;
      return dropUndef({ id, type, points, color: col, fill: bool(raw.fill) });
    }
    case 'number-line': {
      const at = stagePt(raw.at);
      const r = range3(raw.range);
      const len = num(raw.length);
      if (!at || !r || len === null || len <= 0) return null;
      return dropUndef({ id, type, at, length: clamp(len, 1, 13), range: r, color: col, numbers: bool(raw.numbers) });
    }
    case 'brace': {
      const from = stagePt(raw.from);
      const to = stagePt(raw.to);
      if (!from || !to || (from[0] === to[0] && from[1] === to[1])) return null;
      return dropUndef({ id, type, from, to, label: cleanText(raw.label, LIMITS.label) ?? undefined, color: col });
    }
    case 'box': {
      const at = stagePt(raw.at);
      const label = cleanText(raw.label, LIMITS.label);
      if (!at || !label) return null;
      const s = Array.isArray(raw.size) && raw.size.length === 2 ? [num(raw.size[0]), num(raw.size[1])] : null;
      const size = s && s[0] !== null && s[1] !== null ? ([clamp(s[0], 0.5, 10), clamp(s[1], 0.4, 4)] as [number, number]) : undefined;
      return dropUndef({ id, type, at, size, label, sub: cleanText(raw.sub, LIMITS.label) ?? undefined, color: col, fill: bool(raw.fill), round: bool(raw.round) });
    }
    case 'tangent': {
      const x = num(raw.x);
      if (!isType(raw.graph, 'function-graph') || x === null) return null;
      const len = num(raw.length);
      return dropUndef({ id, type, graph: raw.graph as string, x, length: len === null ? undefined : clamp(len, 0.5, 8), color: col, dot: bool(raw.dot) });
    }
    case 'area': {
      const r = Array.isArray(raw.range) && raw.range.length === 2 ? [num(raw.range[0]), num(raw.range[1])] : null;
      if (!isType(raw.graph, 'function-graph') || !r || r[0] === null || r[1] === null || !(r[0] < r[1])) return null;
      return dropUndef({ id, type, graph: raw.graph as string, range: [r[0], r[1]] as [number, number], color: col });
    }
    case 'riemann': {
      const r = Array.isArray(raw.range) && raw.range.length === 2 ? [num(raw.range[0]), num(raw.range[1])] : null;
      const n = num(raw.n);
      if (!isType(raw.graph, 'function-graph') || !r || r[0] === null || r[1] === null || !(r[0] < r[1]) || n === null) return null;
      return dropUndef({ id, type, graph: raw.graph as string, range: [r[0], r[1]] as [number, number], n: Math.round(clamp(n, 1, LIMITS.riemannN)), color: col });
    }
    case 'grid': {
      const at = stagePt(raw.at);
      const extent = num(raw.extent);
      if (!at || extent === null) return null;
      return dropUndef({ id, type, at, extent: clamp(Math.round(extent), 1, 6), color: col });
    }
    case 'group': {
      if (!Array.isArray(raw.children)) return null;
      const children = raw.children.filter((c): c is string => typeof c === 'string' && known.has(c) && c !== id).slice(0, LIMITS.groupChildren);
      return children.length ? { id, type, children } : null;
    }
    default:
      return null;
  }
}

// ── Timeline validation ───────────────────────────────────────────

function validateEntry(raw: unknown, known: Map<string, StageObjectType>, sceneDur: number): TimelineEntry | null {
  if (!isObj(raw)) return null;
  const action = raw.do;
  if (typeof action !== 'string' || !(STAGE_ACTIONS as readonly string[]).includes(action)) return null;
  const rawTargets = typeof raw.target === 'string' ? [raw.target] : Array.isArray(raw.target) ? raw.target : [];
  const target = rawTargets.filter((t): t is string => typeof t === 'string' && known.has(t)).slice(0, LIMITS.targets);
  if (!target.length) return null;
  const at = num(raw.at);
  const dur = num(raw.dur);
  if (at === null || at < 0 || at >= sceneDur) return null;
  const d = clamp(dur ?? 1, 0.1, LIMITS.entryDur);
  const e: TimelineEntry = { at, dur: Math.min(d, sceneDur - at), do: action as StageAction, target };
  const firstType = known.get(target[0]);

  switch (action) {
    case 'transform': {
      if (typeof raw.to !== 'string' || !known.has(raw.to) || target.includes(raw.to)) return null;
      e.to = raw.to;
      break;
    }
    case 'move-to': {
      const p = stagePt(raw.point);
      if (!p) return null;
      e.point = p;
      break;
    }
    case 'move-along':
    case 'trace-tangent': {
      const a = num(raw.fromX);
      const b = num(raw.toX);
      if (a === null || b === null) return null;
      if (action === 'trace-tangent' && firstType !== 'tangent') return null;
      if (action === 'move-along' && firstType !== 'dot') return null;
      e.fromX = clamp(a, -1000, 1000);
      e.toX = clamp(b, -1000, 1000);
      break;
    }
    case 'orbit': {
      const c = stagePt(raw.center);
      const r = num(raw.radius);
      const a = num(raw.fromDeg);
      const b = num(raw.toDeg);
      if (!c || r === null || a === null || b === null || firstType !== 'dot') return null;
      e.center = c;
      e.radius = clamp(r, 0.1, 6);
      e.fromDeg = clamp(a, -3600, 3600);
      e.toDeg = clamp(b, -3600, 3600);
      break;
    }
    case 'apply-matrix': {
      const m = Array.isArray(raw.matrix) && raw.matrix.length === 4 ? raw.matrix.map(num) : null;
      if (!m || m.some((v) => v === null)) return null;
      e.matrix = m.map((v) => clamp(v as number, -4, 4)) as [number, number, number, number];
      e.center = stagePt(raw.center) ?? undefined;
      break;
    }
    case 'highlight': {
      e.color = color(raw.color) ?? 'amber';
      break;
    }
    case 'grow-arrow': {
      if (!target.every((t) => known.get(t) === 'vector')) return null;
      break;
    }
    case 'draw-graph': {
      if (!target.every((t) => known.get(t) === 'function-graph')) return null;
      break;
    }
    default:
      break;
  }
  if (bool(raw.linear)) e.linear = true;
  return e;
}

const TEXT_H = { sm: 0.4, md: 0.55, lg: 0.8, xl: 1.1 } as const;

/** Rough box of a free-standing text or formula, in stage units, centred on its anchor. */
function textBox(o: StageObject): { w: number; h: number } | null {
  if (o.type !== 'text' && o.type !== 'mathtex') return null;
  const base = TEXT_H[o.size ?? 'md'];
  if (o.type === 'text') return { w: Math.min(o.text.length * base * 0.34, 9), h: base };
  const tall = /\\(d?frac|sqrt|sum|int|lim|binom|begin)/.test(o.latex);
  return { w: Math.min(o.latex.length * base * 0.2, 9), h: tall ? base * 1.9 : base * 1.1 };
}

/**
 * Models place formulas a little too close together (a fraction is about twice as tall as it looks in the
 * JSON). Walk top to bottom and push a text that would land on the one above it down, as far as the stage allows.
 */
export function separateTexts(objects: StageObject[]): void {
  const items = objects
    .map((o) => ({ o, b: textBox(o) }))
    .filter((x): x is { o: Extract<StageObject, { at: Pt }>; b: { w: number; h: number } } => x.b !== null && 'at' in x.o)
    .sort((a, b) => b.o.at[1] - a.o.at[1]);
  for (let i = 1; i < items.length; i++) {
    const cur = items[i];
    for (let j = 0; j < i; j++) {
      const up = items[j];
      const sameColumn = Math.abs(cur.o.at[0] - up.o.at[0]) < (cur.b.w + up.b.w) / 2;
      const need = (cur.b.h + up.b.h) / 2 + 0.1;
      if (sameColumn && up.o.at[1] - cur.o.at[1] < need) cur.o.at = [cur.o.at[0], Math.max(-3.2, up.o.at[1] - need)];
    }
  }
}

/** Validate a stage. Returns null when nothing drawable is left. */
export function validateStage(raw: unknown, sceneDur: number): StageSpec | null {
  if (!isObj(raw) || !Array.isArray(raw.objects)) return null;
  const known = new Map<string, StageObjectType>();
  const objects: StageObject[] = [];
  for (const o of raw.objects) {
    if (objects.length >= LIMITS.objects) break;
    const v = validateObject(o, known);
    if (!v) continue;
    // Anchored lines and vectors can only point at dots that exist earlier.
    objects.push(v);
    known.set(v.id, v.type);
  }
  if (!objects.some((o) => o.type !== 'group')) return null;
  separateTexts(objects);
  const timeline: TimelineEntry[] = [];
  const rawTimeline = Array.isArray(raw.timeline) ? raw.timeline : [];
  for (const t of rawTimeline) {
    if (timeline.length >= LIMITS.timeline) break;
    const v = validateEntry(t, known, sceneDur);
    if (v) timeline.push(v);
  }
  timeline.sort((a, b) => a.at - b.at);
  return { objects, timeline };
}

// ── Scene-level normalization ─────────────────────────────────────

export interface NormalizedCaption {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/** What the player consumes: every scene has a validated stage. */
export interface PlayableScene {
  id: string;
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  narration: string;
  captions: NormalizedCaption[];
  stage: StageSpec;
}

export function normalizeCaptions(raw: unknown, dur: number): NormalizedCaption[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedCaption[] = [];
  for (const c of raw.slice(0, 12)) {
    if (!isObj(c)) continue;
    const text = cleanText(c.text, 220);
    const s = num(c.startSeconds);
    const e = num(c.endSeconds);
    if (!text || s === null || e === null) continue;
    out.push({ startSeconds: clamp(s, 0, dur), endSeconds: clamp(e, 0, dur), text });
  }
  return out
    .filter((c) => c.endSeconds > c.startSeconds)
    .sort((a, b) => a.startSeconds - b.startSeconds);
}

/**
 * Captions in the old shape carry absolute video time (scene 2 starts at 12). Convert to scene time
 * when every caption sits past the scene length. New scenes already use scene time.
 */
function sceneTimeCaptions(raw: unknown, dur: number, sceneStart: number): NormalizedCaption[] {
  const caps = Array.isArray(raw) ? raw : [];
  const looksAbsolute =
    sceneStart > 0 &&
    caps.length > 0 &&
    caps.every((c) => isObj(c) && (num(c.startSeconds) ?? 0) >= sceneStart - 0.5);
  const shifted = looksAbsolute
    ? caps.map((c) => (isObj(c) ? { ...c, startSeconds: (num(c.startSeconds) ?? 0) - sceneStart, endSeconds: (num(c.endSeconds) ?? 0) - sceneStart } : c))
    : caps;
  return normalizeCaptions(shifted, dur);
}

/** Evenly spread the narration into caption windows when none survived. */
function captionsFromNarration(narration: string, dur: number): NormalizedCaption[] {
  const parts = narration.split(/(?<=[.!?。])\s+/).map((p) => p.trim()).filter(Boolean).slice(0, 6);
  if (!parts.length) return [];
  const total = parts.reduce((a, p) => a + p.length, 0) || 1;
  let t = 0;
  return parts.map((p) => {
    const span = (p.length / total) * dur;
    const c = { startSeconds: t, endSeconds: Math.min(dur, t + span), text: p.slice(0, 220) };
    t += span;
    return c;
  });
}

/** Narration length in seconds at speed 1 (about 2.4 words per second, a little less for Indonesian). */
export function estimateNarrationSeconds(narration: string, language: 'id' | 'en' = 'id'): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length;
  return words / (language === 'en' ? 2.6 : 2.3);
}

export const DEFAULT_SCENE_SECONDS = 14;

/**
 * Seconds a scene should run so voice and animation end together:
 * the declared length, stretched when the narration needs more time.
 */
export function runtimeSeconds(scene: { durationSeconds: number; narration: string }, language: 'id' | 'en' = 'id'): number {
  const need = estimateNarrationSeconds(scene.narration, language) + 1.2;
  return clamp(Math.max(scene.durationSeconds, need), LIMITS.sceneMin, LIMITS.sceneMax + 10);
}

export { isObj, num, clamp, stagePt, sceneTimeCaptions, captionsFromNarration };
