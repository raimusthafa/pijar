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
const pTex = (p: Raw, k: string, def: string) => {
  const v = cleanText(p[k], 150);
  return v && SAFE_LATEX_CHARS.test(v) ? v : def;
};

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

const titleObj = (ctx: RecipeCtx): Raw => ({ id: 'ttl', type: 'text', text: ctx.title.slice(0, 60), at: [-6.4, 3.25], size: 'md', color: 'muted', align: 'left' });
const titleIn = (ctx: RecipeCtx): Raw => ({ do: 'write', target: 'ttl', at: 0.1, dur: Math.min(1.2, ctx.d * 0.1) });

function plotFrame(p: Raw, ctx: RecipeCtx, defaults: { x: [number, number]; y: [number, number] }) {
  const [x0, x1] = pPair(p, 'xRange', defaults.x, -100, 100);
  const [y0, y1] = pPair(p, 'yRange', defaults.y, -100, 100);
  const xr: [number, number] = x0 < x1 ? [x0, x1] : defaults.x;
  const yr: [number, number] = y0 < y1 ? [y0, y1] : defaults.y;
  const at: [number, number] = [-1.7, -0.25];
  const size: [number, number] = [8.2, 4.7];
  const stepOf = (a: number, b: number) => {
    const raw = (b - a) / 6;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
  };
  const axes: Raw = {
    id: 'ax', type: 'axes', at, size, xRange: [xr[0], xr[1], stepOf(xr[0], xr[1])], yRange: [yr[0], yr[1], stepOf(yr[0], yr[1])],
    numbers: true, color: 'muted',
  };
  void ctx;
  return { axes, map: axesMap(at, size, xr, yr), xr, yr };
}

// ── math recipes ──────────────────────────────────────────────────

const functionPlot: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'x^2');
  const { axes, xr } = plotFrame(p, ctx, { x: [-4, 4], y: [-1, 9] });
  const label = pTex(p, 'label', `f(x) = ${exprToTex(expr)}`);
  const d = ctx.d;
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'lbl', type: 'mathtex', latex: label, at: [4.6, 1.6], size: 'lg', color: 'amber' },
      { id: 'note', type: 'text', text: pStr(p, 'note', ''), at: [4.6, 0.4], size: 'sm', color: 'off-white', align: 'center' },
    ].filter((o) => o.type !== 'text' || o.text),
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.08, dur: d * 0.18 },
      { do: 'draw-graph', target: 'g', at: d * 0.28, dur: d * 0.3 },
      { do: 'write', target: 'lbl', at: d * 0.4, dur: d * 0.18 },
      { do: 'fade-in', target: 'note', at: d * 0.62, dur: d * 0.12 },
      { do: 'indicate', target: 'lbl', at: d * 0.8, dur: d * 0.12 },
    ],
  };
};

const derivativeTangent: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'x^2');
  const { axes, xr } = plotFrame(p, ctx, { x: [-3, 3], y: [-1, 9] });
  const a = pNum(p, 'from', xr[0] + (xr[1] - xr[0]) * 0.15, xr[0], xr[1]);
  const b = pNum(p, 'to', xr[0] + (xr[1] - xr[0]) * 0.85, xr[0], xr[1]);
  const fl = pTex(p, 'label', `f(x) = ${exprToTex(expr)}`);
  const dl = pTex(p, 'derivative', "f'(x) = \\text{slope}");
  const d = ctx.d;
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'g', type: 'function-graph', axes: 'ax', expr, color: 'amber', xRange: xr },
      { id: 'fl', type: 'mathtex', latex: fl, at: [4.7, 1.9], size: 'lg', color: 'amber' },
      { id: 'dl', type: 'mathtex', latex: dl, at: [4.7, 1.9], size: 'lg', color: 'off-white' },
      { id: 'tg', type: 'tangent', graph: 'g', x: a, length: 3.4, color: 'off-white', dot: true },
      { id: 'hint', type: 'text', text: pStr(p, 'hint', ctx.language === 'en' ? 'The slope changes as the point moves' : 'Kemiringan berubah saat titik bergerak', 60), at: [4.7, 0.4], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.07, dur: d * 0.16 },
      { do: 'draw-graph', target: 'g', at: d * 0.24, dur: d * 0.26 },
      { do: 'write', target: 'fl', at: d * 0.32, dur: d * 0.16 },
      { do: 'fade-in', target: 'tg', at: d * 0.5, dur: d * 0.08 },
      { do: 'trace-tangent', target: 'tg', fromX: a, toX: b, at: d * 0.56, dur: d * 0.3 },
      { do: 'transform', target: 'fl', to: 'dl', at: d * 0.58, dur: d * 0.14 },
      { do: 'fade-in', target: 'hint', at: d * 0.72, dur: d * 0.1 },
      { do: 'trace-tangent', target: 'tg', fromX: b, toX: (a + b) / 2, at: d * 0.88, dur: d * 0.1 },
    ],
  };
};

const areaRiemann: Recipe = (p, ctx) => {
  const expr = pExpr(p, 'expr', 'sqrt(x)');
  const { axes, xr } = plotFrame(p, ctx, { x: [-0.5, 5], y: [-0.5, 3] });
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
      { id: 'lbl', type: 'mathtex', latex: label, at: [4.7, 1.6], size: 'lg', color: 'off-white' },
      { id: 'n1', type: 'text', text: pStr(p, 'n1', ctx.language === 'en' ? '4 slices' : '4 irisan', 30), at: [4.7, 0.3], size: 'sm', color: 'muted', align: 'center' },
      { id: 'n2', type: 'text', text: pStr(p, 'n2', ctx.language === 'en' ? '12 slices' : '12 irisan', 30), at: [4.7, 0.3], size: 'sm', color: 'muted', align: 'center' },
      { id: 'n3', type: 'text', text: pStr(p, 'n3', ctx.language === 'en' ? 'Thinner and thinner' : 'Makin tipis', 30), at: [4.7, 0.3], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
      { do: 'draw-graph', target: 'g', at: d * 0.2, dur: d * 0.22 },
      { do: 'write', target: 'lbl', at: d * 0.32, dur: d * 0.14 },
      { do: 'fade-in', target: 'r1', at: d * 0.46, dur: d * 0.1 },
      { do: 'fade-in', target: 'n1', at: d * 0.48, dur: d * 0.08 },
      { do: 'fade-out', target: 'n1', at: d * 0.6, dur: d * 0.04 },
      { do: 'transform', target: 'r1', to: 'r2', at: d * 0.62, dur: d * 0.12 },
      { do: 'fade-in', target: 'n2', at: d * 0.66, dur: d * 0.06 },
      { do: 'fade-out', target: 'n2', at: d * 0.76, dur: d * 0.04 },
      { do: 'transform', target: 'r1', to: 'r3', at: d * 0.78, dur: d * 0.1 },
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
  const { axes, map } = plotFrame({ xRange: xr, yRange: yr }, ctx, { x: [-1, 7], y: [-1, 6] });
  const d = ctx.d;
  const near = (v: [number, number], dx: number, dy: number): [number, number] => {
    const q = map(v[0], v[1]);
    return [q[0] + dx, q[1] + dy];
  };
  const mid = (u: [number, number], v: [number, number]): [number, number] => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  const la = pStr(p, 'labelA', 'a', 12);
  const lb = pStr(p, 'labelB', 'b', 12);
  return {
    objects: [
      titleObj(ctx), axes,
      { id: 'va', type: 'vector', from: [0, 0], to: a, axes: 'ax', color: 'off-white' },
      { id: 'vb', type: 'vector', from: a, to: sum, axes: 'ax', color: 'muted' },
      { id: 'vb0', type: 'vector', from: [0, 0], to: b, axes: 'ax', color: 'muted' },
      { id: 'vs', type: 'vector', from: [0, 0], to: sum, axes: 'ax', color: 'amber' },
      { id: 'la', type: 'mathtex', latex: `\\vec{${la}}`, at: near(mid([0, 0], a), 0.15, -0.4), size: 'md', color: 'off-white' },
      { id: 'lb', type: 'mathtex', latex: `\\vec{${lb}}`, at: near(mid(a, sum), 0.4, 0.15), size: 'md', color: 'muted' },
      { id: 'ls', type: 'mathtex', latex: `\\vec{${la}}+\\vec{${lb}}`, at: near(mid([0, 0], sum), -0.9, 0.3), size: 'md', color: 'amber' },
      { id: 'eq', type: 'mathtex', latex: `\\vec{${la}}+\\vec{${lb}} = \\begin{pmatrix}${fmt(sum[0])}\\\\${fmt(sum[1])}\\end{pmatrix}`, at: [4.9, 1.2], size: 'lg', color: 'amber' },
      { id: 'tip', type: 'text', text: pStr(p, 'note', ctx.language === 'en' ? 'Tip to tail' : 'Ujung ke pangkal', 40), at: [4.9, 0.1], size: 'sm', color: 'muted', align: 'center' },
    ],
    timeline: [
      titleIn(ctx),
      { do: 'create', target: 'ax', at: d * 0.06, dur: d * 0.14 },
      { do: 'grow-arrow', target: 'va', at: d * 0.22, dur: d * 0.14 },
      { do: 'write', target: 'la', at: d * 0.3, dur: d * 0.08 },
      { do: 'grow-arrow', target: 'vb', at: d * 0.4, dur: d * 0.14 },
      { do: 'write', target: 'lb', at: d * 0.48, dur: d * 0.08 },
      { do: 'fade-in', target: 'tip', at: d * 0.5, dur: d * 0.08 },
      { do: 'grow-arrow', target: 'vs', at: d * 0.62, dur: d * 0.16 },
      { do: 'write', target: 'ls', at: d * 0.72, dur: d * 0.1 },
      { do: 'write', target: 'eq', at: d * 0.8, dur: d * 0.14 },
      { do: 'indicate', target: 'vs', at: d * 0.92, dur: d * 0.06 },
    ].map((e) => e),
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
  const { axes, xr } = plotFrame(p, ctx, { x: [-1, 5], y: [-1, 9] });
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
      { id: 'lbl', type: 'mathtex', latex: label, at: [4.7, 1.6], size: 'lg', color: 'off-white' },
      { id: 'res', type: 'text', text: pStr(p, 'result', ctx.language === 'en' ? 'Both sides meet at the same value' : 'Dua sisi bertemu di nilai yang sama', 48), at: [4.7, 0.4], size: 'sm', color: 'muted', align: 'center' },
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
  const G: [number, number] = [-2.0, -0.2];
  const u = 0.6; // grid cell (stage units), fixed in the engine in stage units
  const d = ctx.d;
  const mat = `\\begin{pmatrix}${fmt(a)}&${fmt(c)}\\\\${fmt(b)}&${fmt(e)}\\end{pmatrix}`;
  return {
    objects: [
      titleObj(ctx),
      { id: 'gr', type: 'grid', at: G, extent: 3, color: 'muted' },
      { id: 'i', type: 'vector', from: G, to: [G[0] + u * 3, G[1]], color: 'success' },
      { id: 'j', type: 'vector', from: G, to: [G[0], G[1] + u * 3], color: 'danger' },
      { id: 'sq', type: 'polygon', points: [G, [G[0] + u * 3, G[1]], [G[0] + u * 3, G[1] + u * 3], [G[0], G[1] + u * 3]], color: 'amber', fill: true },
      { id: 'mt', type: 'mathtex', latex: `A = ${mat}`, at: [4.5, 1.5], size: 'lg', color: 'amber' },
      { id: 'cols', type: 'text', text: pStr(p, 'note', ctx.language === 'en' ? 'The columns say where the arrows land' : 'Kolom matriks menunjukkan arah panah mendarat', 56), at: [4.5, 0.3], size: 'sm', color: 'muted', align: 'center' },
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
  const { axes, xr } = plotFrame(p, ctx, { x: [-4, 4], y: [-1, 10] });
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
      { id: 'rule', type: 'mathtex', latex: pTex(p, 'rule', 'x_{new} = x - \\alpha\\, f\'(x)'), at: [4.7, 1.7], size: 'lg', color: 'off-white' },
      { id: 'lowest', type: 'text', text: pStr(p, 'note', ctx.language === 'en' ? 'Steps shrink near the minimum' : 'Langkah mengecil dekat titik minimum', 48), at: [4.7, 0.4], size: 'sm', color: 'muted', align: 'center' },
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
            sub: k === 1 ? (ctx.language === 'en' ? 'base case' : 'base case') : `${k} * ${fn}(${k - 1})`,
            ret: String(r),
          };
        });
  const d = ctx.d;
  const objs: Raw[] = [titleObj(ctx)];
  const tl: Raw[] = [titleIn(ctx)];
  const x0 = -2.2;
  const h = 0.95;
  const gap = 0.16;
  const y0 = -2.35;
  objs.push({ id: 'floor', type: 'line', from: [x0 - 2.6, y0 - h / 2 - 0.12], to: [x0 + 2.6, y0 - h / 2 - 0.12], color: 'muted' });
  objs.push({ id: 'stk', type: 'text', text: pStr(p, 'stackLabel', 'call stack', 20), at: [x0, y0 - h / 2 - 0.5], size: 'sm', color: 'muted' });
  const rule = cleanText(p.rule, 48) ?? (given.length < 2 ? `${fn}(n) = n * ${fn}(n - 1)` : null);
  if (rule) {
    objs.push({ id: 'rule', type: 'text', text: rule, at: [3.9, 2.1], size: 'sm', color: 'off-white', align: 'center', mono: true });
    tl.push({ do: 'write', target: 'rule', at: d * 0.12, dur: d * 0.14 });
  }
  tl.push({ do: 'create', target: 'floor', at: d * 0.07, dur: d * 0.08 });
  tl.push({ do: 'fade-in', target: 'stk', at: d * 0.1, dur: d * 0.08 });
  const pushSpan = d * 0.42;
  const per = pushSpan / frames.length;
  frames.forEach((f, i) => {
    const isBase = i === frames.length - 1;
    const y = y0 + i * (h + gap);
    objs.push({ id: `f${i}`, type: 'box', at: [x0, y], size: [5.2, h], label: f.label, sub: f.sub, color: isBase ? 'amber' : 'off-white', fill: isBase, round: true });
    tl.push({ do: 'fade-in', target: `f${i}`, at: d * 0.18 + i * per, dur: Math.min(per * 0.9, 1.2) });
  });
  // Unwinding: top frame returns first.
  const unStart = d * 0.62;
  const unPer = (d * 0.34) / frames.length;
  for (let i = frames.length - 1, k = 0; i >= 0; i--, k++) {
    const f = frames[i];
    const y = y0 + i * (h + gap);
    tl.push({ do: 'highlight', target: `f${i}`, color: 'success', at: unStart + k * unPer, dur: unPer * 0.35 });
    if (f.ret) {
      objs.push({ id: `r${i}`, type: 'text', text: `return ${f.ret}`, at: [x0 + 3.2, y], size: 'md', color: 'success', align: 'left', mono: true });
      tl.push({ do: 'fade-in', target: `r${i}`, at: unStart + k * unPer + unPer * 0.2, dur: unPer * 0.4 });
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
  const w = Math.min(2.5, 11.4 / n - 0.55);
  const step = (12.2 - w) / Math.max(1, n - 1);
  const x = (i: number): number => (n === 1 ? 0 : -6.1 + w / 2 + i * step);
  const objs: Raw[] = [titleObj(ctx)];
  const tl: Raw[] = [titleIn(ctx)];
  stages.forEach((s, i) => {
    objs.push({ id: `s${i}`, type: 'box', at: [x(i), 0.2], size: [w, 1.2], label: s, sub: subs[i], color: 'off-white', round: true });
    if (i > 0) objs.push({ id: `a${i}`, type: 'vector', from: [x(i - 1) + w / 2 + 0.05, 0.2], to: [x(i) - w / 2 - 0.05, 0.2], color: 'muted' });
  });
  objs.push({ id: 'tok', type: 'dot', at: [x(0), -1.3], color: 'amber', radius: 0.17 });
  const per = (d * 0.7) / n;
  stages.forEach((_, i) => {
    tl.push({ do: 'fade-in', target: `s${i}`, at: d * 0.1 + i * per * 0.55, dur: per * 0.5 });
    if (i > 0) tl.push({ do: 'grow-arrow', target: `a${i}`, at: d * 0.1 + i * per * 0.55 - per * 0.1, dur: per * 0.4 });
  });
  const tokStart = d * 0.1 + n * per * 0.55 + 0.2;
  const tokPer = Math.max(0.5, (d * 0.95 - tokStart) / n);
  tl.push({ do: 'fade-in', target: 'tok', at: tokStart, dur: 0.4 });
  stages.forEach((_, i) => {
    if (i > 0) tl.push({ do: 'move-to', target: 'tok', point: [x(i), -1.3], at: tokStart + (i - 1) * tokPer + 0.3, dur: tokPer * 0.8 });
    tl.push({ do: 'highlight', target: `s${i}`, color: 'amber', at: tokStart + i * tokPer + (i ? 0.5 : 0.3), dur: tokPer * 0.5 });
  });
  return { objects: objs, timeline: tl };
};

const codeWalk: Recipe = (p, ctx) => {
  const lines = pList(p, 'code', 8).map((l) => (typeof l === 'string' ? l.replace(/\t/g, '  ').slice(0, 48) : '')).filter(Boolean);
  const code = lines.length >= 2 ? lines : ['function f(n) {', '  if (n <= 1) return 1;', '  return n * f(n - 1);', '}'];
  const vars = pList(p, 'steps', 6).map((s) => cleanText(s, 40)).filter((s): s is string => !!s);
  const steps = vars.length ? vars : ctx.language === 'en' ? ['Start here', 'Check the condition', 'Do the work', 'Return the result'] : ['Mulai di sini', 'Periksa kondisi', 'Kerjakan', 'Kembalikan hasil'];
  const d = ctx.d;
  const lh = 0.55;
  const top = 1.5;
  const objs: Raw[] = [
    titleObj(ctx),
    { id: 'panel', type: 'rectangle', at: [-2.4, top - ((code.length - 1) * lh) / 2], size: [7.2, code.length * lh + 0.5], color: 'muted' },
    { id: 'bar', type: 'rectangle', at: [-2.4, top], size: [7.0, lh], color: 'amber', fill: true },
  ];
  code.forEach((l, i) => objs.push({ id: `c${i}`, type: 'text', text: l, at: [-5.8, top - i * lh], size: 'sm', color: 'off-white', align: 'left', mono: true }));
  const tl: Raw[] = [titleIn(ctx), { do: 'create', target: 'panel', at: d * 0.07, dur: d * 0.12 }, { do: 'fade-in', target: code.map((_, i) => `c${i}`), at: d * 0.14, dur: d * 0.2 }];
  const n = Math.min(steps.length, code.length);
  const per = (d * 0.6) / n;
  for (let i = 0; i < n; i++) {
    objs.push({ id: `t${i}`, type: 'text', text: steps[i], at: [4.4, top - ((code.length - 1) * lh) / 2], size: 'md', color: 'off-white', align: 'center' });
    const at = d * 0.36 + i * per;
    if (i === 0) tl.push({ do: 'fade-in', target: 'bar', at, dur: per * 0.4 });
    else tl.push({ do: 'move-to', target: 'bar', point: [-2.4, top - i * lh], at, dur: per * 0.4 });
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
  const objs: Raw[] = [titleObj(ctx), { id: 'hub', type: 'box', at: [0, 0], size: [boxW(center, 3.4), 1.15], label: center, color: 'amber', fill: true, round: true }];
  const tl: Raw[] = [titleIn(ctx), { do: 'fade-in', target: 'hub', at: d * 0.1, dur: d * 0.12 }];
  items.forEach((s, i) => {
    const ang = Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2 + Math.PI / n;
    const px = Math.cos(ang) * 4.1;
    const py = Math.sin(ang) * 2.0;
    objs.push({ id: `k${i}`, type: 'box', at: [px, py], size: [boxW(s, 2.7), 0.9], label: s, color: 'off-white', round: true });
    objs.push({ id: `l${i}`, type: 'vector', from: [px * 0.43, py * 0.43], to: [px * 0.7, py * 0.7], color: 'muted' });
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
