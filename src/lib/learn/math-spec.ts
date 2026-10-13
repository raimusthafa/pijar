// ================================================================
// PIJAR - Declarative math visual spec (never code, never eval)
// The AI emits JSON; this file validates it and compiles formulas
// through an allow-list tokenizer before mathjs ever sees the text.
// ================================================================

import { compile } from 'mathjs/number';
import type { MathSpec, MathTemplate } from './types';

const TEMPLATES: MathTemplate[] = ['function-plot', 'vector-add', 'tangent', 'area', 'ratio', 'exponential'];

const MAX_EXPR_LEN = 80;
const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'exp', 'ln', 'log', 'abs']);
const CONSTANTS = new Set(['pi', 'e']);
// mathjs: log = natural log, log10 = base 10. The spec says ln = natural, log = base 10.
const FN_REWRITE: Record<string, string> = { ln: 'log', log: 'log10' };

const TOKEN_RE = /\s+|\d+(?:\.\d+)?|\.\d+|[a-z]+|[-+*/^()]/gy;

/** Returns a safe numeric function of x, or null if the text is not an allowed formula. */
export function compileExpr(input: unknown): ((x: number) => number) | null {
  if (typeof input !== 'string') return null;
  const str = input.trim().toLowerCase();
  if (!str || str.length > MAX_EXPR_LEN) return null;

  // 1. Tokenize with an allow-list; any character outside it rejects the whole string.
  const out: string[] = [];
  TOKEN_RE.lastIndex = 0;
  let pos = 0;
  let prev: string | null = null;
  while (pos < str.length) {
    TOKEN_RE.lastIndex = pos;
    const m = TOKEN_RE.exec(str);
    if (!m) return null;
    pos = TOKEN_RE.lastIndex;
    const tok = m[0];
    if (/^\s+$/.test(tok)) continue;
    if (/^[a-z]+$/.test(tok)) {
      const next = str.slice(pos).trimStart()[0];
      if (FUNCTIONS.has(tok)) {
        if (next !== '(') return null;
        out.push(FN_REWRITE[tok] ?? tok);
      } else if (tok === 'x' || CONSTANTS.has(tok)) {
        if (next === '(') return null; // no x(...) / e(...) call syntax
        out.push(tok);
      } else {
        return null;
      }
    } else {
      out.push(tok);
    }
    prev = tok;
  }
  if (prev === null) return null;

  // 2. Only now hand the rebuilt token string to the mathjs number-only build.
  let fn: { evaluate: (scope: { x: number }) => unknown };
  try {
    fn = compile(out.join(' '));
  } catch {
    return null;
  }
  return (x: number) => {
    try {
      const v = fn.evaluate({ x });
      return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
    } catch {
      return NaN;
    }
  };
}

// ── Defaults per template ──────────────────────────────────────────

export const DEFAULT_MATH_SPECS: Record<MathTemplate, MathSpec> = {
  'function-plot': {
    template: 'function-plot',
    viewBox: { x: [-5, 5], y: [-2, 10] },
    functions: [{ expr: 'x^2', label: 'f(x) = x^2' }],
  },
  'vector-add': {
    template: 'vector-add',
    viewBox: { x: [-1, 7], y: [-1, 6] },
    vectors: [
      { to: [3, 1], label: 'a' },
      { to: [1, 3], label: 'b' },
    ],
  },
  tangent: {
    template: 'tangent',
    viewBox: { x: [-3, 3], y: [-1, 9] },
    functions: [{ expr: 'x^2', label: 'f(x) = x^2' }],
    tangentAt: 1,
  },
  area: {
    template: 'area',
    viewBox: { x: [-1, 5], y: [-1, 5] },
    functions: [{ expr: 'sqrt(x)', label: 'f(x) = sqrt(x)' }],
    shadeArea: [0, 4],
  },
  ratio: {
    template: 'ratio',
    viewBox: { x: [-1, 8], y: [-1, 8] },
    ratio: { a: 2, b: 3 },
  },
  exponential: {
    template: 'exponential',
    viewBox: { x: [-3, 4], y: [-1, 10] },
    functions: [{ expr: '2^x', label: 'f(x) = 2^x' }],
  },
};

// ── Validation ────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const label = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 40) : undefined;

function pair(v: unknown, lo: number, hi: number): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const a = num(v[0]);
  const b = num(v[1]);
  if (a === null || b === null) return null;
  return [clamp(a, lo, hi), clamp(b, lo, hi)];
}

function range(v: unknown): [number, number] | null {
  const p = pair(v, -100, 100);
  return p && p[0] < p[1] ? p : null;
}

/** Clamped, normalized MathSpec, or null when the input is unusable. Unknown fields are dropped. */
export function validateMathSpec(input: unknown): MathSpec | null {
  if (!isObj(input)) return null;
  const template = input.template as MathTemplate;
  if (!TEMPLATES.includes(template)) return null;
  const def = DEFAULT_MATH_SPECS[template];
  const spec: MathSpec = { template };

  const vb = isObj(input.viewBox) ? input.viewBox : null;
  const vx = vb ? range(vb.x) : null;
  const vy = vb ? range(vb.y) : null;
  spec.viewBox = vx && vy ? { x: vx, y: vy } : def.viewBox;

  if (Array.isArray(input.functions)) {
    const fns: NonNullable<MathSpec['functions']> = [];
    for (const f of input.functions) {
      if (fns.length >= 3) break;
      if (isObj(f) && typeof f.expr === 'string' && compileExpr(f.expr)) {
        fns.push({ expr: f.expr.trim(), label: label(f.label) });
      }
    }
    if (fns.length) spec.functions = fns;
  }

  if (Array.isArray(input.vectors)) {
    const vs: NonNullable<MathSpec['vectors']> = [];
    for (const v of input.vectors) {
      if (vs.length >= 4) break;
      if (!isObj(v)) continue;
      const to = pair(v.to, -100, 100);
      if (!to) continue;
      const from = v.from === undefined ? undefined : pair(v.from, -100, 100) ?? undefined;
      vs.push({ ...(from ? { from } : {}), to, label: label(v.label) });
    }
    if (vs.length) spec.vectors = vs;
  }

  if (Array.isArray(input.points)) {
    const ps: NonNullable<MathSpec['points']> = [];
    for (const p of input.points) {
      if (ps.length >= 6) break;
      if (!isObj(p)) continue;
      const at = pair(p.at, -100, 100);
      if (at) ps.push({ at, label: label(p.label) });
    }
    if (ps.length) spec.points = ps;
  }

  const ta = num(input.tangentAt);
  if (ta !== null) spec.tangentAt = clamp(ta, -100, 100);

  const sa = pair(input.shadeArea, -100, 100);
  if (sa && sa[0] < sa[1]) spec.shadeArea = sa;

  if (isObj(input.ratio)) {
    const a = num(input.ratio.a);
    const b = num(input.ratio.b);
    if (a !== null && b !== null && a > 0 && b > 0) spec.ratio = { a: clamp(a, 0.1, 100), b: clamp(b, 0.1, 100) };
  }

  // Fill what the template needs so the renderer never faces an empty graph.
  if (template === 'vector-add') {
    if (!spec.vectors) spec.vectors = def.vectors;
  } else if (template === 'ratio') {
    if (!spec.ratio) spec.ratio = def.ratio;
  } else {
    if (!spec.functions) spec.functions = def.functions;
    if (template === 'tangent' && spec.tangentAt === undefined) spec.tangentAt = def.tangentAt;
    if (template === 'area' && !spec.shadeArea) spec.shadeArea = def.shadeArea;
  }
  return spec;
}

/**
 * Validate every scene's visualState.math in an AI-produced material.
 * Invalid specs are removed; the material itself is never rejected here.
 */
export function sanitizeScenesMath(material: unknown): void {
  if (!isObj(material) || !isObj(material.videoScript) || !Array.isArray(material.videoScript.scenes)) return;
  for (const scene of material.videoScript.scenes) {
    if (!isObj(scene) || !isObj(scene.visualState) || !('math' in scene.visualState)) continue;
    const clean = validateMathSpec(scene.visualState.math);
    if (clean) scene.visualState.math = clean;
    else delete scene.visualState.math;
  }
}

/** One plain sentence (Indonesian) saying what the graph shows, for aria-label and text fallback. */
export function describeMathSpec(spec: MathSpec): string {
  const fn = spec.functions?.map((f) => f.label || `f(x) = ${f.expr}`).join(', ');
  switch (spec.template) {
    case 'vector-add':
      return `Grafik vektor: ${spec.vectors?.map((v) => `${v.label || 'vektor'} menuju (${v.to[0]}, ${v.to[1]})`).join('; ')}.`;
    case 'tangent':
      return `Grafik ${fn} dengan garis singgung di x = ${spec.tangentAt}.`;
    case 'area':
      return `Grafik ${fn} dengan daerah di bawah kurva diarsir dari x = ${spec.shadeArea?.[0]} sampai x = ${spec.shadeArea?.[1]}.`;
    case 'ratio':
      return `Diagram perbandingan ${spec.ratio?.a} : ${spec.ratio?.b}.`;
    case 'exponential':
      return `Grafik eksponensial ${fn}.`;
    default:
      return `Grafik fungsi ${fn}.`;
  }
}
