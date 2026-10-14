// ================================================================
// PIJAR - Scene recipes: functions that return DSL fragments.
// The AI may name a recipe with parameters ("recipe": {name, params})
// or write a custom stage. Both are validated by scene-dsl.ts, so a
// recipe only has to produce plausible data; bad parameters fall back
// to safe defaults here and the result is validated again anyway.
// Stage frame: x from -6.5 to 6.5, y from -3.4 to 3.4.
// ================================================================

import { compileExpr } from './math-spec.ts';
import { cleanText } from './scene-dsl.ts';

type Raw = Record<string, unknown>;
export interface Fragment {
  objects: Raw[];
  timeline: Raw[];
}
export interface RecipeCtx {
  /** Scene length in seconds (the declared duration). */
  d: number;
  title: string;
  language: 'id' | 'en';
}
type Recipe = (p: Raw, ctx: RecipeCtx) => Fragment;

// ── parameter helpers ─────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pNum = (p: Raw, k: string, def: number, lo = -1000, hi = 1000) =>
  typeof p[k] === 'number' && Number.isFinite(p[k]) ? clamp(p[k] as number, lo, hi) : def;
const pStr = (p: Raw, k: string, def: string, max = 80) => cleanText(p[k], max) ?? def;
const pExpr = (p: Raw, k: string, def: string) => (typeof p[k] === 'string' && compileExpr(p[k]) ? (p[k] as string).trim() : def);
const pList = (p: Raw, k: string, max: number): unknown[] => (Array.isArray(p[k]) ? (p[k] as unknown[]).slice(0, max) : []);
const pPair = (p: Raw, k: string, def: [number, number], lo = -1000, hi = 1000): [number, number] => {
  const v = p[k];
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && Number.isFinite(v[0]) && Number.isFinite(v[1])) {
    return [clamp(v[0], lo, hi), clamp(v[1], lo, hi)];
  }
  return def;
};
const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
const SAFE_LATEX_CHARS = /^[\w\s\\{}^_+\-*/=().,|<>[\]!:;'&%]+$/;
/** Bare function names the model writes as plain text ("cos(x)") become LaTeX operators so they are not set in italic letters. */
const fixTex = (v: string) => v.replace(/(?<![\\a-zA-Z])(sin|cos|tan|cot|sec|csc|ln|log|exp)(?![a-zA-Z])/g, '\\$1').replace(/(?<![\\a-zA-Z])pi(?![a-zA-Z])/g, '\\pi');
const pTex = (p: Raw, k: string, def: string) => {
  const v = cleanText(p[k], 150);
  return v && SAFE_LATEX_CHARS.test(v) ? fixTex(v) : def;
};
/** "cos(x)" alone is a right-hand side: give it the left-hand side the stage shows beside it. */
const withLhs = (tex: string, lhs: string) => (tex.includes('=') ? tex : `${lhs} = ${tex}`);

/** Convert a function expression for display ("x^2" -> "x^{2}") in a LaTeX label. */
function exprToTex(expr: string): string {
  return expr
    .replace(/\*/g, ' \\cdot ')
    .replace(/sqrt\(([^()]*)\)/g, '\\sqrt{$1}')
    .replace(/\^\(([^()]*)\)/g, '^{$1}')
    .replace(/\^([a-z0-9.]+)/gi, '^{$1}')
    .replace(/\b(sin|cos|tan|ln|log|exp)\b/g, '\\$1')
    .replace(/\bpi\b/g, '\\pi');
}

/** Linear map from axes coordinates to stage coordinates for an axes object. */
function axesMap(at: [number, number], size: [number, number], xr: [number, number], yr: [number, number]) {
  return (x: number, y: number): [number, number] => [
    at[0] + ((x - (xr[0] + xr[1]) / 2) / (xr[1] - xr[0])) * size[0],
    at[1] + ((y - (yr[0] + yr[1]) / 2) / (yr[1] - yr[0])) * size[1],
  ];
}

/** Box width that fits a label (about 0.15 stage units per character). */
const boxW = (label: string, min: number) => clamp(label.length * 0.15 + 0.9, min, 5);

const titleObj = (ctx: RecipeCtx): Raw => ({ id: 'ttl', type: 'text', text: ctx.title.slice(0, 60), at: [-6.4, 3.25], size: 'lg', color: 'off-white', align: 'left' });
const titleIn = (ctx: RecipeCtx): Raw => ({ do: 'write', target: 'ttl', at: 0.1, dur: Math.min(1.2, ctx.d * 0.1) });

const stepOf = (a: number, b: number) => {
  const raw = (b - a) / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
};

/** Slope of f by central differences (what a function-graph with derivative:true plots). */
const slopeOf = (f: (x: number) => number) => (x: number) => (f(x + 1e-3) - f(x - 1e-3)) / 2e-3;

/**
 * A y range that frames the curve: sampled over x, outliers (tan near its poles) trimmed,
 * zero kept in view when it is close, padded and rounded to a clean tick step.
 */
export function fitRange(f: (x: number) => number, xr: [number, number]): [number, number] {
  const ys: number[] = [];
  for (let i = 0; i <= 160; i++) {
    const y = f(xr[0] + ((xr[1] - xr[0]) * i) / 160);
    if (Number.isFinite(y)) ys.push(y);
  }
  if (ys.length < 8) return [-1, 1];
  ys.sort((u, v) => u - v);
  let lo = ys[Math.floor(ys.length * 0.02)];
  let hi = ys[Math.ceil(ys.length * 0.98) - 1];
  if (hi - lo < 1e-6) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  if (lo > 0 && lo < span * 0.6) lo = 0;
  if (hi < 0 && -hi < span * 0.6) hi = 0;
  lo -= span * 0.12;
  hi += span * 0.12;
  const step = stepOf(lo, hi);
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

/** Default x range: two periods for trig, a plain window otherwise. */
export const defaultX = (expr: string): [number, number] => (/sin|cos|tan/.test(expr) ? [-6, 6] : [-4, 4]);

// The plot sits on the left, a notes column on the right (x from 2.7 to 6.6).
const PLOT_AT: [number, number] = [-2.1, -0.1];
const PLOT_SIZE: [number, number] = [8.5, 5.0];
const COL_X = 4.7;
const COL_W = 3.7;

function plotFrame(
  p: Raw,
  ctx: RecipeCtx,
  defaults: { x: [number, number]; y?: [number, number] },
  opts: { expr?: string; at?: [number, number]; size?: [number, number]; id?: string; yOf?: (f: (x: number) => number) => (x: number) => number } = {},
) {
  const [x0, x1] = pPair(p, 'xRange', defaults.x, -100, 100);
  const xr: [number, number] = x0 < x1 ? [x0, x1] : defaults.x;
  const [y0, y1] = pPair(p, 'yRange', [0, 0], -100, 100);
  let yr: [number, number] = y0 < y1 ? [y0, y1] : defaults.y ?? [-1, 1];
  const f = opts.expr ? compileExpr(opts.expr) : null;
  // The model rarely knows the right window, so fit it to the curve unless the caller pinned one.
  if (f && !(y0 < y1)) yr = fitRange(opts.yOf ? opts.yOf((x) => f(x)) : (x) => f(x), xr);
  const at = opts.at ?? PLOT_AT;
  const size = opts.size ?? PLOT_SIZE;
  const axes: Raw = {
    id: opts.id ?? 'ax', type: 'axes', at, size, xRange: [xr[0], xr[1], stepOf(xr[0], xr[1])], yRange: [yr[0], yr[1], stepOf(yr[0], yr[1])],
    numbers: true, color: 'muted',
  };
  void ctx;
  return { axes, map: axesMap(at, size, xr, yr), xr, yr };
}

// ── math recipes ──────────────────────────────────────────────────

const functionPlot: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'x^2');
  const { axes, xr } = plotFrame(p, ctx, { x: defaultX(expr) }, { expr });
  const label = pTex(p, 'label', `f(x) = ${exprToTex(expr)}`);
  const d = ctx.d;
  const x1 = xr[0] + (xr[1] - xr[0]) * 0.18;
  const x2 = xr[0] + (xr[1] - xr[0]) * 0.82;
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'pt', type: 'dot', axes: 'ax', onGraph: { graph: 'g', x: x1 }, color: 'off-white', radius: 0.13 },
      { id: 'lbl', type: 'mathtex', latex: label, at: [COL_X, 1.5], size: 'lg', color: 'amber' },
      { id: 'note', type: 'text', priority: 'low', text: pStr(p, 'note', '', 90), at: [COL_X, 0.2], size: 'sm', color: 'off-white', align: 'center' },
    ].filter((o) => o.type !== 'text' || o.text),
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.08, dur: d * 0.18 },
      { do: 'draw-graph', target: 'g', at: d * 0.28, dur: d * 0.3 },
      { do: 'write', target: 'lbl', at: d * 0.4, dur: d * 0.18 },
      { do: 'fade-in', target: 'note', at: d * 0.6, dur: d * 0.12 },
      { do: 'fade-in', target: 'pt', at: d * 0.62, dur: d * 0.06 },
      { do: 'move-along', target: 'pt', fromX: x1, toX: x2, at: d * 0.68, dur: d * 0.28 },
      { do: 'indicate', target: 'lbl', at: d * 0.9, dur: d * 0.08 },
    ],
  };
};

const derivativeTangent: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'x^2');
  const xr0 = pPair(p, 'xRange', defaultX(expr), -100, 100);
  const xr: [number, number] = xr0[0] < xr0[1] ? xr0 : defaultX(expr);
  // Two plots that share x: the curve above, its slope below, so the tangent's slope is read straight onto the lower curve.
  const top = plotFrame({ xRange: xr }, ctx, { x: xr }, { expr, at: [-2.1, 1.2], size: [8.5, 2.9] });
  const low = plotFrame({ xRange: xr }, ctx, { x: xr }, { expr, id: 'ax2', at: [-2.1, -2.15], size: [8.5, 1.7], yOf: slopeOf });
  const a = pNum(p, 'from', xr[0] + (xr[1] - xr[0]) * 0.15, xr[0], xr[1]);
  const b = pNum(p, 'to', xr[0] + (xr[1] - xr[0]) * 0.85, xr[0], xr[1]);
  const fl = withLhs(pTex(p, 'label', `f(x) = ${exprToTex(expr)}`), 'f(x)');
  const dl = withLhs(pTex(p, 'derivative', "f'(x) = \\text{slope}"), "f'(x)");
  const d = ctx.d;
  const t0 = d * 0.58;
  const win = d * 0.38;
  return {
    objects: [
      titleObj(ctx), top.axes, low.axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'g2', type: 'function-graph', axes: 'ax2', expr, color: 'off-white', xRange: [a, b], derivative: true },
      { id: 'tg', type: 'tangent', graph: 'g', x: a, length: 2.7, color: 'off-white', dot: false },
      { id: 'pp', type: 'dot', axes: 'ax', onGraph: { graph: 'g', x: a }, color: 'amber', radius: 0.18 },
      { id: 'pq', type: 'dot', axes: 'ax2', onGraph: { graph: 'g2', x: a }, color: 'off-white', radius: 0.12 },
      { id: 'con', type: 'line', from: 'pp', to: 'pq', color: 'muted', dashed: true },
      { id: 'fl', type: 'mathtex', latex: fl, at: [COL_X, 1.9], size: 'lg', color: 'amber' },
      { id: 'dl', type: 'mathtex', latex: dl, at: [COL_X, 0.7], size: 'lg', color: 'off-white' },
      { id: 'hint', type: 'text', priority: 'low', text: pStr(p, 'hint', ctx.language === 'en' ? 'The height of the lower curve is the slope of the tangent above' : 'Tinggi kurva bawah sama dengan kemiringan garis singgung di atas', 90), at: [COL_X, -0.9], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
      { do: 'draw-graph', target: 'g', at: d * 0.2, dur: d * 0.2 },
      { do: 'write', target: 'fl', at: d * 0.28, dur: d * 0.14 },
      { do: 'fade-in', target: ['tg', 'pp'], at: d * 0.4, dur: d * 0.06 },
      { do: 'create', target: 'ax2', at: d * 0.44, dur: d * 0.1 },
      { do: 'fade-in', target: ['pq', 'con'], at: d * 0.54, dur: d * 0.04 },
      { do: 'trace-tangent', target: 'tg', fromX: a, toX: b, at: t0, dur: win },
      { do: 'move-along', target: 'pp', fromX: a, toX: b, at: t0, dur: win },
      { do: 'move-along', target: 'pq', fromX: a, toX: b, at: t0, dur: win },
      { do: 'draw-graph', target: 'g2', at: t0, dur: win },
      { do: 'write', target: 'dl', at: t0 + win * 0.25, dur: d * 0.1 },
      { do: 'fade-in', target: 'hint', at: t0 + win * 0.5, dur: d * 0.08 },
    ],
  };
};

const areaRiemann: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'sqrt(x)');
  const { axes, xr } = plotFrame(p, ctx, { x: [-0.5, 5] }, { expr });
  const a = pNum(p, 'a', Math.max(0, xr[0] + 0.5), xr[0], xr[1]);
  const b = pNum(p, 'b', xr[1] - 1, xr[0], xr[1]);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b) === lo ? lo + 1 : Math.max(a, b);
  const label = pTex(p, 'label', `\\int_{${fmt(lo)}}^{${fmt(hi)}} f(x)\\,dx`);
  const d = ctx.d;
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'r1', type: 'riemann', graph: 'g', range: [lo, hi], n: 4, color: 'off-white' },
      { id: 'r2', type: 'riemann', graph: 'g', range: [lo, hi], n: 12, color: 'off-white' },
      { id: 'r3', type: 'riemann', graph: 'g', range: [lo, hi], n: 40, color: 'off-white' },
      { id: 'ar', type: 'area', graph: 'g', range: [lo, hi], color: 'amber' },
      { id: 'lbl', type: 'mathtex', latex: label, at: [COL_X, 1.5], size: 'lg', color: 'amber' },
      { id: 'n1', type: 'text', text: pStr(p, 'n1', ctx.language === 'en' ? '4 slices' : '4 irisan', 30), at: [COL_X, 0.2], size: 'md', color: 'muted', align: 'center' },
      { id: 'n2', type: 'text', text: pStr(p, 'n2', ctx.language === 'en' ? '12 slices' : '12 irisan', 30), at: [COL_X, 0.2], size: 'md', color: 'muted', align: 'center' },
      { id: 'n3', type: 'text', text: pStr(p, 'n3', ctx.language === 'en' ? 'Thinner and thinner' : 'Makin tipis', 30), at: [COL_X, 0.2], size: 'md', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
      { do: 'draw-graph', target: 'g', at: d * 0.2, dur: d * 0.22 },
      { do: 'write', target: 'lbl', at: d * 0.32, dur: d * 0.14 },
      { do: 'fade-in', target: 'r1', at: d * 0.46, dur: d * 0.1 },
      { do: 'fade-in', target: 'n1', at: d * 0.48, dur: d * 0.08 },
      { do: 'fade-out', target: 'n1', at: d * 0.6, dur: d * 0.04 },
      { do: 'fade-out', target: 'r1', at: d * 0.6, dur: d * 0.04 },
      { do: 'fade-in', target: 'r2', at: d * 0.64, dur: d * 0.1 },
      { do: 'fade-in', target: 'n2', at: d * 0.66, dur: d * 0.06 },
      { do: 'fade-out', target: 'n2', at: d * 0.76, dur: d * 0.04 },
      { do: 'fade-out', target: 'r2', at: d * 0.76, dur: d * 0.04 },
      { do: 'fade-in', target: 'r3', at: d * 0.8, dur: d * 0.08 },
      { do: 'fade-in', target: 'n3', at: d * 0.82, dur: d * 0.06 },
      { do: 'fade-in', target: 'ar', at: d * 0.9, dur: d * 0.08 },
    ],
  };
};

const vectorAdd: Recipe = (p, ctx) => {
  const a = pPair(p, 'a', [3, 1], -8, 8);
  const b = pPair(p, 'b', [1, 3], -8, 8);
  const sum: [number, number] = [a[0] + b[0], a[1] + b[1]];
  const xs = [0, a[0], b[0], sum[0]];
  const ys = [0, a[1], b[1], sum[1]];
  const pad = 1;
  const xr: [number, number] = [Math.floor(Math.min(...xs) - pad), Math.ceil(Math.max(...xs) + pad)];
  const yr: [number, number] = [Math.floor(Math.min(...ys) - pad), Math.ceil(Math.max(...ys) + pad)];
  const { axes, map } = plotFrame({ xRange: xr, yRange: yr }, ctx, { x: xr, y: yr });
  const d = ctx.d;
  // Each label sits beside its arrow, on the side facing away from the triangle the three arrows make.
  const o = map(0, 0);
  const sa = map(a[0], a[1]);
  const ss = map(sum[0], sum[1]);
  const cen: [number, number] = [(o[0] + sa[0] + ss[0]) / 3, (o[1] + sa[1] + ss[1]) / 3];
  const beside = (from: [number, number], to: [number, number], gap: number): [number, number] => {
    const u = map(from[0], from[1]);
    const v = map(to[0], to[1]);
    const m: [number, number] = [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
    const len = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1;
    let nx = -(v[1] - u[1]) / len;
    let ny = (v[0] - u[0]) / len;
    if (nx * (m[0] - cen[0]) + ny * (m[1] - cen[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    // A label that would land on the x axis goes to the other side of its arrow.
    if (Math.abs(m[1] + ny * gap - o[1]) < 0.3) {
      nx = -nx;
      ny = -ny;
    }
    return [m[0] + nx * gap, m[1] + ny * gap];
  };
  const la = pStr(p, 'labelA', 'a', 12);
  const lb = pStr(p, 'labelB', 'b', 12);
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'vb0', type: 'line', from: [0, 0], to: b, axes: 'ax', color: 'muted', dashed: true },
      { id: 'va', type: 'vector', from: [0, 0], to: a, axes: 'ax', color: 'off-white' },
      { id: 'vb', type: 'vector', from: a, to: sum, axes: 'ax', color: 'muted' },
      { id: 'vs', type: 'vector', from: [0, 0], to: sum, axes: 'ax', color: 'amber' },
      { id: 'la', type: 'mathtex', latex: `\\vec{${la}}`, at: beside([0, 0], a, 0.42), size: 'md', color: 'off-white' },
      { id: 'lb', type: 'mathtex', latex: `\\vec{${lb}}`, at: beside(a, sum, 0.42), size: 'md', color: 'muted' },
      { id: 'ls', type: 'mathtex', latex: '\\vec{s}', at: beside([0, 0], sum, 0.52), size: 'md', color: 'amber' },
      { id: 'pa', type: 'mathtex', latex: `\\vec{${la}} = \\begin{pmatrix}${fmt(a[0])}\\\\${fmt(a[1])}\\end{pmatrix}`, at: [3.8, 1.9], size: 'md', color: 'off-white' },
      { id: 'pb', type: 'mathtex', latex: `\\vec{${lb}} = \\begin{pmatrix}${fmt(b[0])}\\\\${fmt(b[1])}\\end{pmatrix}`, at: [3.8, 1.0], size: 'md', color: 'off-white' },
      { id: 'eq', type: 'mathtex', latex: `\\vec{s} = \\vec{${la}}+\\vec{${lb}} = \\begin{pmatrix}${fmt(sum[0])}\\\\${fmt(sum[1])}\\end{pmatrix}`, at: [3.8, 0.0], size: 'md', color: 'amber' },
      { id: 'tip', type: 'text', priority: 'low', text: pStr(p, 'note', ctx.language === 'en' ? 'Place the tail of one arrow on the tip of the other' : 'Letakkan pangkal satu panah di ujung panah yang lain', 80), at: [3.8, -1.0], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
      { do: 'grow-arrow', target: 'va', at: d * 0.22, dur: d * 0.14 },
      { do: 'write', target: 'la', at: d * 0.3, dur: d * 0.08 },
      { do: 'write', target: 'pa', at: d * 0.34, dur: d * 0.08 },
      { do: 'grow-arrow', target: 'vb', at: d * 0.42, dur: d * 0.14 },
      { do: 'write', target: 'lb', at: d * 0.48, dur: d * 0.08 },
      { do: 'write', target: 'pb', at: d * 0.52, dur: d * 0.08 },
      { do: 'fade-in', target: 'tip', at: d * 0.56, dur: d * 0.08 },
      { do: 'create', target: 'vb0', at: d * 0.62, dur: d * 0.08 },
      { do: 'grow-arrow', target: 'vs', at: d * 0.68, dur: d * 0.14 },
      { do: 'write', target: 'ls', at: d * 0.76, dur: d * 0.08 },
      { do: 'write', target: 'eq', at: d * 0.82, dur: d * 0.12 },
      { do: 'indicate', target: 'vs', at: d * 0.93, dur: d * 0.05 },
    ],
  };
};

const unitCircle: Recipe = (p, ctx) => {
  const d = ctx.d;
  const C: [number, number] = [-3.7, -0.2];
  const R = 1.9;
  const A: [number, number] = [2.4, -0.2];
  const size: [number, number] = [6.6, 2 * R];
  const q = axesMap(A, size, [0, 2 * Math.PI], [-1, 1]);
  void q;
  return {
    objects: [
      titleObj(ctx),
      { id: 'cc', type: 'circle', at: C, radius: R, color: 'muted' },
      { id: 'hx', type: 'line', from: [C[0] - R - 0.4, C[1]], to: [C[0] + R + 0.4, C[1]], color: 'muted' },
      { id: 'hy', type: 'line', from: [C[0], C[1] - R - 0.4], to: [C[0], C[1] + R + 0.4], color: 'muted' },
      { id: 'o', type: 'dot', at: C, color: 'muted', radius: 0.05 },
      { id: 'p', type: 'dot', at: [C[0] + R, C[1]], color: 'amber', radius: 0.11 },
      { id: 'rad', type: 'line', from: 'o', to: 'p', color: 'off-white' },
      { id: 'sx', type: 'axes', at: A, size, xRange: [0, 2 * Math.PI, Math.PI / 2], yRange: [-1, 1, 1], numbers: false, color: 'muted' },
      { id: 'sg', type: 'function-graph', axes: 'sx', expr: 'sin(x)', color: 'amber', xRange: [0, 2 * Math.PI] },
      { id: 'q', type: 'dot', axes: 'sx', onGraph: { graph: 'sg', x: 0 }, color: 'amber', radius: 0.11 },
      { id: 'con', type: 'line', from: 'p', to: 'q', color: 'muted', dashed: true },
      { id: 'tl', type: 'mathtex', latex: '\\sin\\theta', at: [A[0] + 0.6, A[1] + R + 0.65], size: 'lg', color: 'amber' },
      { id: 'cl', type: 'mathtex', latex: '(\\cos\\theta,\\ \\sin\\theta)', at: [C[0], C[1] - R - 0.75], size: 'md', color: 'off-white' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: ['cc', 'hx', 'hy'], at: d * 0.07, dur: d * 0.16 },
      { do: 'fade-in', target: ['o', 'p', 'rad'], at: d * 0.22, dur: d * 0.08 },
      { do: 'create', target: 'sx', at: d * 0.26, dur: d * 0.14 },
      { do: 'write', target: 'cl', at: d * 0.32, dur: d * 0.12 },
      { do: 'fade-in', target: ['q', 'con'], at: d * 0.42, dur: d * 0.06 },
      { do: 'write', target: 'tl', at: d * 0.44, dur: d * 0.1 },
      { do: 'orbit', target: 'p', center: C, radius: R, fromDeg: 0, toDeg: 360, at: d * 0.5, dur: d * 0.44, linear: true },
      { do: 'draw-graph', target: 'sg', at: d * 0.5, dur: d * 0.44, linear: true },
      { do: 'move-along', target: 'q', fromX: 0, toX: 2 * Math.PI, at: d * 0.5, dur: d * 0.44, linear: true },
    ],
  };
};

const limitApproach: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'x^2');
  const { axes, xr } = plotFrame(p, ctx, { x: [-1, 5] }, { expr });
  const a = pNum(p, 'a', 2, xr[0] + 0.3, xr[1] - 0.3);
  const label = pTex(p, 'label', `\\lim_{x \\to ${fmt(a)}} f(x)`);
  const d = ctx.d;
  const span = (xr[1] - xr[0]) * 0.35;
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'hole', type: 'dot', axes: 'ax', onGraph: { graph: 'g', x: a }, color: 'off-white', radius: 0.12, hollow: true },
      { id: 'dl', type: 'dot', axes: 'ax', onGraph: { graph: 'g', x: Math.max(xr[0], a - span) }, color: 'danger', radius: 0.1 },
      { id: 'dr', type: 'dot', axes: 'ax', onGraph: { graph: 'g', x: Math.min(xr[1], a + span) }, color: 'success', radius: 0.1 },
      { id: 'lbl', type: 'mathtex', latex: label, at: [COL_X, 1.5], size: 'lg', color: 'amber' },
      { id: 'res', type: 'text', priority: 'low', text: pStr(p, 'result', ctx.language === 'en' ? 'Both sides meet at the same value' : 'Dua sisi bertemu di nilai yang sama', 60), at: [COL_X, 0.2], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
      { do: 'draw-graph', target: 'g', at: d * 0.2, dur: d * 0.24 },
      { do: 'write', target: 'lbl', at: d * 0.32, dur: d * 0.16 },
      { do: 'fade-in', target: ['hole', 'dl', 'dr'], at: d * 0.48, dur: d * 0.06 },
      { do: 'move-along', target: 'dl', fromX: Math.max(xr[0], a - span), toX: a - span * 0.02, at: d * 0.56, dur: d * 0.3 },
      { do: 'move-along', target: 'dr', fromX: Math.min(xr[1], a + span), toX: a + span * 0.02, at: d * 0.56, dur: d * 0.3 },
      { do: 'fade-in', target: 'res', at: d * 0.84, dur: d * 0.1 },
      { do: 'indicate', target: 'hole', at: d * 0.9, dur: d * 0.08 },
    ],
  };
};

const matrixTransform: Recipe = (p, ctx) => {
  const m = pList(p, 'matrix', 4).map((v) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, -3, 3) : 0));
  const [a, b, c, e] = m.length === 4 ? m : [1, 1, 0, 1];
  const G: [number, number] = [-2.4, -0.3];
  const u = 0.6; // grid cell (stage units), fixed in the engine in stage units
  const d = ctx.d;
  // Fewer cells when the matrix stretches a lot, so the result still fits between the title and the bottom edge.
  const reachX = Math.max(Math.abs(a) + Math.abs(c), 1);
  const reachY = Math.max(Math.abs(b) + Math.abs(e), 1);
  const cells = Math.max(1, Math.min(3, Math.floor(4.2 / (u * reachX)), Math.floor(3.0 / (u * reachY))));
  const mat = `\\begin{pmatrix}${fmt(a)}&${fmt(c)}\\\\${fmt(b)}&${fmt(e)}\\end{pmatrix}`;
  return {
    objects: [
      titleObj(ctx),
      { id: 'gr', type: 'grid', at: G, extent: cells, color: 'muted' },
      { id: 'i', type: 'vector', from: G, to: [G[0] + u * cells, G[1]], color: 'success' },
      { id: 'j', type: 'vector', from: G, to: [G[0], G[1] + u * cells], color: 'danger' },
      { id: 'sq', type: 'polygon', points: [G, [G[0] + u * cells, G[1]], [G[0] + u * cells, G[1] + u * cells], [G[0], G[1] + u * cells]], color: 'amber', fill: true },
      { id: 'mt', type: 'mathtex', latex: `A = ${mat}`, at: [4.5, 1.5], size: 'lg', color: 'amber' },
      { id: 'cols', type: 'text', priority: 'low', text: pStr(p, 'note', ctx.language === 'en' ? 'The columns say where the arrows land' : 'Kolom matriks menunjukkan arah panah mendarat', 56), at: [4.5, 0.3], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'gr', at: d * 0.07, dur: d * 0.2 },
      { do: 'grow-arrow', target: ['i', 'j'], at: d * 0.3, dur: d * 0.14 },
      { do: 'fade-in', target: 'sq', at: d * 0.42, dur: d * 0.1 },
      { do: 'write', target: 'mt', at: d * 0.48, dur: d * 0.16 },
      { do: 'apply-matrix', target: ['gr', 'i', 'j', 'sq'], matrix: [a, b, c, e], center: G, at: d * 0.62, dur: d * 0.26 },
      { do: 'fade-in', target: 'cols', at: d * 0.84, dur: d * 0.1 },
    ],
  };
};

const gradientDescent: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'x^2');
  const { axes, xr } = plotFrame(p, ctx, { x: [-4, 4] }, { expr });
  const start = pNum(p, 'start', xr[0] + (xr[1] - xr[0]) * 0.1, xr[0], xr[1]);
  const lr = pNum(p, 'rate', 0.3, 0.02, 0.9);
  const steps = Math.round(pNum(p, 'steps', 5, 2, 7));
  const d = ctx.d;
  // Numeric derivative so any allowed expression works.
  const f = compileExpr(expr)!;
  const slope = (x: number) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4;
  const xsList = [start];
  for (let i = 0; i < steps; i++) {
    const last = xsList[xsList.length - 1];
    const next = clamp(last - lr * slope(last) * (expr.replace(/\s/g, '') === 'x^2' ? 1 : 1), xr[0], xr[1]);
    xsList.push(Number.isFinite(next) ? next : last);
  }
  const tl: Raw[] = [
    titleIn(ctx),
    { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
    { do: 'draw-graph', target: 'g', at: d * 0.2, dur: d * 0.24 },
    { do: 'write', target: 'rule', at: d * 0.32, dur: d * 0.16 },
    { do: 'fade-in', target: 'pt', at: d * 0.48, dur: d * 0.06 },
  ];
  const t0 = d * 0.56;
  const per = (d * 0.38) / steps;
  for (let i = 0; i < steps; i++) {
    tl.push({ do: 'move-along', target: 'pt', fromX: xsList[i], toX: xsList[i + 1], at: t0 + i * per, dur: per * 0.85 });
  }
  tl.push({ do: 'fade-in', target: 'lowest', at: d * 0.88, dur: d * 0.08 });
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'pt', type: 'dot', axes: 'ax', onGraph: { graph: 'g', x: start }, color: 'off-white', radius: 0.13 },
      { id: 'rule', type: 'mathtex', latex: pTex(p, 'rule', 'x_{new} = x - \\alpha\\, f\'(x)'), at: [COL_X, 1.5], size: 'lg', color: 'amber' },
      { id: 'lowest', type: 'text', priority: 'low', text: pStr(p, 'note', ctx.language === 'en' ? 'Steps shrink near the minimum' : 'Langkah mengecil dekat titik minimum', 60), at: [COL_X, 0.2], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: tl,
  };
};

// ── concept recipes ───────────────────────────────────────────────

const callStack: Recipe = (p, ctx) => {
  const given = pList(p, 'frames', 6)
    .map((f) => (f && typeof f === 'object' ? (f as Raw) : null))
    .filter((f): f is Raw => !!f && !!cleanText(f.label, 30))
    .map((f) => ({ label: cleanText(f.label, 30)!, sub: cleanText(f.sub, 34) ?? undefined, ret: cleanText(f.ret, 12) ?? undefined }));
  const fn = pStr(p, 'fn', 'factorial', 16);
  const n = Math.round(pNum(p, 'n', 4, 2, 6));
  const frames =
    given.length >= 2
      ? given
      : Array.from({ length: n }, (_, i) => {
          const k = n - i;
          let r = 1;
          for (let j = 2; j <= k; j++) r *= j;
          return {
            label: `${fn}(${k})`,
            sub: k === 1 ? 'base case' : `${k} * ${fn}(${k - 1})`,
            ret: String(r),
          };
        });
  const d = ctx.d;
  const m = frames.length;
  const objs: Raw[] = [titleObj(ctx)];
  const tl: Raw[] = [titleIn(ctx)];
  const h = m > 4 ? 0.7 : 0.95;
  const gap = m > 4 ? 0.12 : 0.16;
  const x0 = -2.9;
  const total = m * h + (m - 1) * gap;
  const y0 = -total / 2 + h / 2 - 0.25; // centre of the bottom frame; the stack grows upward
  const yAt = (i: number) => y0 + i * (h + gap);
  objs.push({ id: 'floor', type: 'line', from: [x0 - 2.6, y0 - h / 2 - 0.12], to: [x0 + 2.6, y0 - h / 2 - 0.12], color: 'muted' });
  objs.push({ id: 'stk', type: 'text', text: pStr(p, 'stackLabel', 'call stack', 20), at: [x0, y0 - h / 2 - 0.5], size: 'sm', color: 'muted' });
  const rule = cleanText(p.rule, 48) ?? (given.length < 2 ? `${fn}(n) = n * ${fn}(n - 1)` : null);
  if (rule) {
    objs.push({ id: 'rule', type: 'text', priority: 'low', text: rule, at: [3.4, Math.min(3.0, yAt(m - 1) + h / 2 + 0.6)], size: 'sm', color: 'off-white', align: 'center', mono: true });
    tl.push({ do: 'write', target: 'rule', at: d * 0.12, dur: d * 0.14 });
  }
  tl.push({ do: 'create', target: 'floor', at: d * 0.07, dur: d * 0.08 });
  tl.push({ do: 'fade-in', target: 'stk', at: d * 0.1, dur: d * 0.08 });
  const pushSpan = d * 0.4;
  const per = pushSpan / m;
  frames.forEach((f, i) => {
    const isBase = i === m - 1;
    objs.push({ id: `f${i}`, type: 'box', at: [x0, yAt(i)], size: [5.0, h], label: f.label, sub: f.sub, color: isBase ? 'amber' : 'off-white', fill: isBase, round: true });
    tl.push({ do: 'fade-in', target: `f${i}`, at: d * 0.18 + i * per, dur: Math.min(per * 0.9, 1.2) });
  });
  // Unwinding: the top frame returns first and its value travels out to the right-hand column.
  const unStart = d * 0.62;
  const unPer = (d * 0.34) / m;
  for (let i = m - 1, k = 0; i >= 0; i--, k++) {
    const f = frames[i];
    const t = unStart + k * unPer;
    tl.push({ do: 'highlight', target: `f${i}`, color: 'success', at: t, dur: unPer * 0.35 });
    if (f.ret) {
      objs.push({ id: `a${i}`, type: 'vector', from: [x0 + 2.6, yAt(i)], to: [2.05, yAt(i)], color: 'success' });
      objs.push({ id: `r${i}`, type: 'box', at: [4.1, yAt(i)], size: [3.8, h * 0.82], label: `return ${f.ret}`, color: 'success', round: true });
      tl.push({ do: 'grow-arrow', target: `a${i}`, at: t + unPer * 0.1, dur: unPer * 0.35 });
      tl.push({ do: 'fade-in', target: `r${i}`, at: t + unPer * 0.35, dur: unPer * 0.4 });
    }
  }
  return { objects: objs, timeline: tl };
};

const treeTraversal: Recipe = (p, ctx) => {
  const labelsIn = pList(p, 'nodes', 7).map((v) => (typeof v === 'string' || typeof v === 'number' ? cleanText(String(v), 6) : null));
  const defaults = ['8', '3', '10', '1', '6', '9', '14'];
  const labels = defaults.map((dflt, i) => labelsIn[i] || dflt);
  const d = ctx.d;
  // complete binary tree, 7 nodes: index -> position
  const pos: [number, number][] = [
    [0, 1.9], [-2.4, 0.4], [2.4, 0.4], [-3.6, -1.2], [-1.2, -1.2], [1.2, -1.2], [3.6, -1.2],
  ].map(([x, y]) => [x - 1.4, y] as [number, number]);
  const order = [3, 1, 4, 0, 5, 2, 6]; // in-order
  const objs: Raw[] = [titleObj(ctx)];
  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  edges.forEach(([a, b], i) => objs.push({ id: `e${i}`, type: 'line', from: pos[a], to: pos[b], color: 'muted' }));
  labels.forEach((l, i) => objs.push({ id: `n${i}`, type: 'box', at: pos[i], size: [0.9, 0.9], label: l, color: 'off-white', round: true }));
  const out = pStr(p, 'outLabel', ctx.language === 'en' ? 'Visit order' : 'Urutan kunjungan', 24);
  objs.push({ id: 'ol', type: 'text', text: out, at: [4.9, 1.7], size: 'sm', color: 'muted', align: 'center' });
  const tl: Raw[] = [titleIn(ctx), { do: 'create', target: edges.map((_, i) => `e${i}`), at: d * 0.07, dur: d * 0.2 }, { do: 'fade-in', target: labels.map((_, i) => `n${i}`), at: d * 0.12, dur: d * 0.2 }, { do: 'fade-in', target: 'ol', at: d * 0.32, dur: d * 0.08 }];
  const per = (d * 0.55) / order.length;
  order.forEach((ni, k) => {
    objs.push({ id: `v${k}`, type: 'text', text: labels[ni], at: [3.4 + (k % 4) * 0.8 + 0.2 - 1.4 + 1.4, 0.6 - Math.floor(k / 4) * 0.9], size: 'lg', color: 'amber', mono: true });
    tl.push({ do: 'highlight', target: `n${ni}`, color: 'amber', at: d * 0.4 + k * per, dur: per * 0.5 });
    tl.push({ do: 'indicate', target: `n${ni}`, at: d * 0.4 + k * per, dur: per * 0.7 });
    tl.push({ do: 'fade-in', target: `v${k}`, at: d * 0.4 + k * per + per * 0.3, dur: per * 0.5 });
  });
  return { objects: objs, timeline: tl };
};

const pipeline: Recipe = (p, ctx) => {
  const given = pList(p, 'stages', 5).map((s) => cleanText(typeof s === 'string' ? s : (s as Raw)?.label, 22)).filter((s): s is string => !!s);
  const stages = given.length >= 2 ? given : ctx.language === 'en' ? ['Input', 'Process', 'Output'] : ['Masukan', 'Proses', 'Keluaran'];
  const subs = pList(p, 'notes', 5).map((s) => cleanText(s, 34) ?? undefined);
  const d = ctx.d;
  const n = stages.length;
  const w = Math.min(3.2, 11.8 / n - 0.65);
  const h = 1.9;
  const y = 0.2;
  const yTok = y - h / 2 - 0.45; // the packet rides under the boxes so it never covers a label
  const x = (i: number): number => (n === 1 ? 0 : -5.9 + w / 2 + (i * (11.8 - w)) / (n - 1));
  const objs: Raw[] = [
    titleObj(ctx),
    { id: 'flow', type: 'text', priority: 'low', text: pStr(p, 'summary', ctx.language === 'en' ? 'Data moves sequentially through each processing stage' : 'Data mengalir bertahap melalui setiap tahapan proses', 80), at: [0, -1.9], size: 'sm', color: 'muted', align: 'center' },
  ];
  const tl: Raw[] = [
    titleIn(ctx),
    { do: 'fade-in', target: 'flow', at: d * 0.28, dur: d * 0.12 },
  ];
  stages.forEach((s, i) => {
    objs.push({ id: `s${i}`, type: 'box', at: [x(i), y], size: [w, h], label: s, sub: subs[i], color: 'off-white', round: true });
    if (i > 0) objs.push({ id: `a${i}`, type: 'vector', from: [x(i - 1) + w / 2 + 0.05, y], to: [x(i) - w / 2 - 0.05, y], color: 'muted' });
  });
  // A packet of data rides along the row, so the order of the stages is something you watch rather than read.
  const startX = x(0) - w / 2 - 0.1;
  objs.push({ id: 'tok', type: 'dot', at: [startX, yTok], color: 'amber', radius: 0.2 });
  const per = (d * 0.5) / n;
  stages.forEach((_, i) => {
    tl.push({ do: 'fade-in', target: `s${i}`, at: d * 0.08 + i * per * 0.55, dur: per * 0.5 });
    if (i > 0) tl.push({ do: 'grow-arrow', target: `a${i}`, at: d * 0.08 + i * per * 0.55 - per * 0.1, dur: per * 0.4 });
  });
  const tokStart = d * 0.08 + n * per * 0.55 + 0.3;
  const tokPer = Math.max(0.6, (d * 0.94 - tokStart) / n);
  tl.push({ do: 'fade-in', target: 'tok', at: tokStart, dur: 0.4 });
  stages.forEach((_, i) => {
    tl.push({ do: 'move-to', target: 'tok', point: [x(i), yTok], at: tokStart + i * tokPer + 0.2, dur: tokPer * 0.75 });
    tl.push({ do: 'highlight', target: `s${i}`, color: 'amber', at: tokStart + i * tokPer + tokPer * 0.7, dur: tokPer * 0.4 });
  });
  return { objects: objs, timeline: tl };
};

const codeWalk: Recipe = (p, ctx) => {
  const lines = pList(p, 'code', 8).map((l) => (typeof l === 'string' ? l.replace(/\t/g, '  ').replace(/\s+$/, '').slice(0, 44) : '')).filter(Boolean);
  const code = lines.length >= 2 ? lines : ['function f(n) {', '  if (n <= 1) return 1;', '  return n * f(n - 1);', '}'];
  const vars = pList(p, 'steps', 6).map((s) => cleanText(s, 60)).filter((s): s is string => !!s);
  const steps = vars.length ? vars : ctx.language === 'en' ? ['Start here', 'Check the condition', 'Do the work', 'Return the result'] : ['Mulai di sini', 'Periksa kondisi', 'Kerjakan', 'Kembalikan hasil'];
  const d = ctx.d;
  const longest = Math.max(...code.map((l) => l.length));
  const big = longest <= 26; // larger type when the lines are short enough
  const lh = Math.min(big ? 0.78 : 0.62, 4.3 / code.length); // the panel stays above the step text under it
  const charW = big ? 0.27 : 0.2;
  const W = Math.min(10, Math.max(5.6, longest * charW + 1.0));
  const mid = 0.35;
  const top = mid + ((code.length - 1) * lh) / 2;
  const stepY = mid - (code.length * lh + 0.6) / 2 - 0.55;
  // The walk visits lines that do something; a lone closing bracket is never the point of a step.
  const live = code.map((l, i) => i).filter((i) => !/^[\s)}\]];,]*$/.test(code[i]));
  const rows = live.length ? live : code.map((_, i) => i);
  const objs: Raw[] = [
    titleObj(ctx),
    { id: 'panel', type: 'rectangle', at: [0, mid], size: [W, code.length * lh + 0.6], color: 'muted' },
    { id: 'bar', type: 'rectangle', at: [0, top - rows[0] * lh], size: [W - 0.2, lh], color: 'amber', fill: true },
  ];
  code.forEach((l, i) => objs.push({ id: `c${i}`, type: 'text', text: l, at: [-W / 2 + 0.4, top - i * lh], size: big ? 'md' : 'sm', color: 'off-white', align: 'left', mono: true }));
  const tl: Raw[] = [titleIn(ctx), { do: 'create', target: 'panel', at: d * 0.07, dur: d * 0.12 }, { do: 'fade-in', target: code.map((_, i) => `c${i}`), at: d * 0.14, dur: d * 0.2 }];
  const n = Math.min(steps.length, rows.length);
  const per = (d * 0.6) / n;
  for (let i = 0; i < n; i++) {
    objs.push({ id: `t${i}`, type: 'text', text: steps[i], at: [0, stepY], size: 'md', color: 'off-white', align: 'center' });
    const at = d * 0.36 + i * per;
    if (i === 0) tl.push({ do: 'fade-in', target: 'bar', at, dur: per * 0.4 });
    else tl.push({ do: 'move-to', target: 'bar', point: [0, top - rows[i] * lh], at, dur: per * 0.4 });
    tl.push({ do: 'fade-in', target: `t${i}`, at: at + per * 0.1, dur: per * 0.35 });
    if (i < n - 1) tl.push({ do: 'fade-out', target: `t${i}`, at: at + per * 0.8, dur: per * 0.18 });
  }
  return { objects: objs, timeline: tl };
};

const conceptMap: Recipe = (p, ctx) => {
  const center = pStr(p, 'center', ctx.title, 28);
  const satellites = pList(p, 'points', 5).map((s) => cleanText(typeof s === 'string' ? s : (s as Raw)?.label, 24)).filter((s): s is string => !!s);
  const items = satellites.length >= 2 ? satellites : ctx.language === 'en' ? ['Idea', 'Example', 'Use'] : ['Gagasan', 'Contoh', 'Penerapan'];
  const d = ctx.d;
  const n = items.length;
  const hubW = boxW(center, 3.4);
  const hubH = 1.15;
  const objs: Raw[] = [titleObj(ctx), { id: 'hub', type: 'box', at: [0, -0.1], size: [hubW, hubH], label: center, color: 'amber', fill: true, round: true }];
  const tl: Raw[] = [titleIn(ctx), { do: 'fade-in', target: 'hub', at: d * 0.1, dur: d * 0.12 }];
  // Distance from a box centre to its edge along a direction, so each arrow runs edge to edge.
  const edge = (hw: number, hh: number, dx: number, dy: number) => Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
  items.forEach((s, i) => {
    const ang = Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2 + Math.PI / n;
    const px = Math.cos(ang) * 4.3;
    const py = Math.sin(ang) * 2.15 - 0.1;
    const w = boxW(s, 2.7);
    objs.push({ id: `k${i}`, type: 'box', at: [px, py], size: [w, 0.9], label: s, color: 'off-white', round: true });
    const dx = px;
    const dy = py + 0.1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const a = edge(hubW / 2, hubH / 2, ux, uy) + 0.12;
    const b = len - edge(w / 2, 0.45, ux, uy) - 0.12;
    objs.push({ id: `l${i}`, type: 'vector', from: [ux * a, uy * a - 0.1], to: [ux * b, uy * b - 0.1], color: 'muted' });
    const at = d * 0.28 + i * ((d * 0.6) / n);
    tl.push({ do: 'grow-arrow', target: `l${i}`, at, dur: d * 0.1 });
    tl.push({ do: 'fade-in', target: `k${i}`, at: at + d * 0.06, dur: d * 0.1 });
  });
  tl.push({ do: 'indicate', target: 'hub', at: d * 0.92, dur: d * 0.06 });
  return { objects: objs, timeline: tl };
};

const ratio: Recipe = (p, ctx) => {
  const a = pNum(p, 'a', 2, 0.5, 20);
  const b = pNum(p, 'b', 3, 0.5, 20);
  const unit = Math.min(1.2, 10 / (a + b));
  const d = ctx.d;
  return {
    objects: [
      titleObj(ctx),
      { id: 'ra', type: 'rectangle', at: [-(a + b) * unit * 0.5 + (a * unit) / 2, 0.8], size: [a * unit, 1.1], color: 'amber', fill: true },
      { id: 'rb', type: 'rectangle', at: [-(a + b) * unit * 0.5 + (b * unit) / 2, -0.9], size: [b * unit, 1.1], color: 'off-white', fill: true },
      { id: 'la', type: 'mathtex', latex: fmt(a), at: [-(a + b) * unit * 0.5 - 0.5, 0.8], size: 'lg', color: 'amber' },
      { id: 'lb', type: 'mathtex', latex: fmt(b), at: [-(a + b) * unit * 0.5 - 0.5, -0.9], size: 'lg', color: 'off-white' },
      { id: 'eq', type: 'mathtex', latex: `${fmt(a)} : ${fmt(b)}`, at: [0, -2.5], size: 'xl', color: 'amber' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'fade-in', target: 'ra', at: d * 0.1, dur: d * 0.2 },
      { do: 'write', target: 'la', at: d * 0.2, dur: d * 0.1 },
      { do: 'fade-in', target: 'rb', at: d * 0.36, dur: d * 0.2 },
      { do: 'write', target: 'lb', at: d * 0.46, dur: d * 0.1 },
      { do: 'write', target: 'eq', at: d * 0.64, dur: d * 0.2 },
      { do: 'indicate', target: 'eq', at: d * 0.88, dur: d * 0.08 },
    ],
  };
};

export const RECIPES: Record<string, Recipe> = {
  'function-plot': functionPlot,
  'derivative-tangent': derivativeTangent,
  'area-riemann': areaRiemann,
  'vector-add': vectorAdd,
  'unit-circle': unitCircle,
  'limit-approach': limitApproach,
  'matrix-transform': matrixTransform,
  'gradient-descent': gradientDescent,
  'call-stack': callStack,
  'tree-traversal': treeTraversal,
  pipeline,
  'code-walk': codeWalk,
  'concept-map': conceptMap,
  ratio,
};

export const RECIPE_NAMES = Object.keys(RECIPES);

export function buildRecipe(name: unknown, params: unknown, ctx: RecipeCtx): Fragment | null {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(RECIPES, name)) return null;
  const p = params && typeof params === 'object' && !Array.isArray(params) ? (params as Raw) : {};
  try {
    return RECIPES[name](p, ctx);
  } catch {
    return null;
  }
}
