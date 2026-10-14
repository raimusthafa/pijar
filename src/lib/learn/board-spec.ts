// ================================================================
// PIJAR - Declarative interactive board spec (data only, never code)
// The AI emits JSON, sanitizeBoardSpec() rebuilds it field by field with caps, so unknown fields,
// hostile formulas and out-of-range numbers never reach the renderer. Formulas go through compileExpr
// (allow-list tokenizer) with the slider names as the only extra identifiers.
// ================================================================

import { compileExpr } from './math-spec.ts';
import { defaultX, fitRange } from './scene-recipes.ts';

export const BOARD_RECIPES = [
  'derivative-tangent', 'secant-tangent', 'riemann-sum', 'vector-addition', 'unit-circle', 'function-transform', 'quadratic-explorer',
] as const;
export type BoardRecipe = (typeof BOARD_RECIPES)[number];

/** Letters a slider may be called, so expressions can use them as parameters. 'e' and 'x' are taken. */
export const SLIDER_NAMES = ['a', 'b', 'c', 'd', 'h', 'k', 'm', 'n', 't'] as const;
export type SliderName = (typeof SLIDER_NAMES)[number];

type Pt = [number, number];
type Ref = string | Pt; // a point id, or fixed coordinates

export interface BoardSlider { name: SliderName; label?: string; min: number; max: number; step: number; initial: number }
export interface BoardCurve { id: string; expr: string; label?: string; dashed?: boolean }
export interface BoardGlider { id: string; on: string; x: number; label?: string }
export interface BoardPoint { id: string; at: Pt; draggable?: boolean; label?: string; sumOf?: [string, string] }
export type ReadoutKind = 'param' | 'x' | 'y' | 'slope' | 'secant' | 'riemann' | 'integral' | 'sin' | 'cos' | 'angle' | 'length';
export interface BoardReadout { label: string; kind: ReadoutKind; ref?: string }

export interface BoardSpec {
  recipe?: BoardRecipe;
  learningGoal: string; // max 140 characters
  instruction: string; // max 200 characters
  viewBox: { x: Pt; y: Pt };
  sliders: BoardSlider[]; // max 4
  curves: BoardCurve[]; // max 3, ids f g h
  gliders: BoardGlider[]; // max 2, sit on a curve
  tangents: { at: string }[]; // max 2, at a glider id
  secants: { from: string; h: string | number }[]; // max 2, h is a slider name or a number
  riemann?: { curve: string; from: number; to: number; n: string | number; kind: 'left' | 'right' | 'middle' };
  area?: { curve: string; from: number; to: number };
  points: BoardPoint[]; // max 6
  vectors: { from: Ref; to: Ref; label?: string; dashed?: boolean }[]; // max 4
  polygons: { points: string[] }[]; // max 2, 3 to 6 point ids
  angles: { points: [string, string, string] }[]; // max 2, the middle id is the vertex
  texts: { at: Pt; text: string }[]; // max 3, plain text
  unitCircle?: { angle: string }; // slider name, in degrees
  readouts: BoardReadout[]; // max 6
}

export const BOARD_CAPS = { sliders: 4, curves: 3, gliders: 2, tangents: 2, secants: 2, points: 6, vectors: 4, polygons: 2, angles: 2, texts: 3, readouts: 6 } as const;

// ── Validation ────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Plain text only: no markup characters, no LaTeX, bounded length. */
const plain = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/[<>&$\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return s || undefined;
};
const pt = (v: unknown, lim = 1000): Pt | null => {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const a = num(v[0]);
  const b = num(v[1]);
  return a === null || b === null ? null : [clamp(a, -lim, lim), clamp(b, -lim, lim)];
};
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const CURVE_IDS = ['f', 'g', 'h'];
const POINT_ID = /^[A-Z]$/;
const sliderName = (v: unknown): SliderName | null => (typeof v === 'string' && (SLIDER_NAMES as readonly string[]).includes(v) ? (v as SliderName) : null);
const READOUT_KINDS: ReadoutKind[] = ['param', 'x', 'y', 'slope', 'secant', 'riemann', 'integral', 'sin', 'cos', 'angle', 'length'];
const DEFAULT_VIEW = { x: [-6, 6] as Pt, y: [-4, 8] as Pt };

/** Rebuilds a BoardSpec from untrusted input. Returns null when nothing drawable is left. */
export function sanitizeBoardSpec(input: unknown): BoardSpec | null {
  if (!isObj(input)) return null;
  if (input.recipe !== undefined && !(BOARD_RECIPES as readonly unknown[]).includes(input.recipe)) return null;
  const raw = input.recipe ? { ...recipeBoard(input.recipe as BoardRecipe, isObj(input.params) ? input.params : {}, input.lang === 'en' ? 'en' : 'id'), ...pickText(input) } : input;
  return normalize(raw, input.recipe as BoardRecipe | undefined);
}

/** A recipe reference may override only the two texts. */
function pickText(i: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (typeof i.instruction === 'string' && i.instruction.trim()) out.instruction = i.instruction;
  if (typeof i.learningGoal === 'string' && i.learningGoal.trim()) out.learningGoal = i.learningGoal;
  return out;
}

function normalize(raw: Record<string, unknown>, recipe?: BoardRecipe): BoardSpec | null {
  const vb = isObj(raw.viewBox) ? raw.viewBox : {};
  const vx = pt(vb.x, 1000);
  const vy = pt(vb.y, 1000);
  const viewBox = vx && vy && vx[0] < vx[1] && vy[0] < vy[1] && vx[1] - vx[0] >= 0.1 && vy[1] - vy[0] >= 0.1 ? { x: vx, y: vy } : DEFAULT_VIEW;

  const sliders: BoardSlider[] = [];
  for (const s of arr(raw.sliders, 8)) {
    if (sliders.length >= BOARD_CAPS.sliders || !isObj(s)) continue;
    const name = sliderName(s.name);
    const min = num(s.min);
    const max = num(s.max);
    if (!name || min === null || max === null || min >= max || sliders.some((x) => x.name === name)) continue;
    let step = num(s.step) ?? (max - min) / 100;
    if (step <= 0 || (max - min) / step > 2000) step = (max - min) / 100;
    const initial = clamp(num(s.initial) ?? min, min, max);
    sliders.push({ name, label: plain(s.label, 40), min, max, step, initial });
  }
  const names = sliders.map((s) => s.name as string);

  const curves: BoardCurve[] = [];
  for (const c of arr(raw.curves, 6)) {
    if (curves.length >= BOARD_CAPS.curves || !isObj(c) || typeof c.expr !== 'string' || !compileExpr(c.expr, names)) continue;
    const id = typeof c.id === 'string' && CURVE_IDS.includes(c.id) && !curves.some((x) => x.id === c.id) ? c.id : CURVE_IDS.find((i) => !curves.some((x) => x.id === i))!;
    curves.push({ id, expr: c.expr.trim(), label: plain(c.label, 40), ...(c.dashed === true ? { dashed: true } : {}) });
  }
  const curveIds = curves.map((c) => c.id);
  const curveOk = (v: unknown): v is string => typeof v === 'string' && curveIds.includes(v);

  const used = new Set<string>();
  const gliders: BoardGlider[] = [];
  for (const g of arr(raw.gliders, 4)) {
    if (gliders.length >= BOARD_CAPS.gliders || !curves.length || !isObj(g)) continue;
    const id = typeof g.id === 'string' && POINT_ID.test(g.id) && !used.has(g.id) ? g.id : ['P', 'Q'].find((i) => !used.has(i));
    if (!id) continue;
    used.add(id);
    const x = clamp(num(g.x) ?? (viewBox.x[0] + viewBox.x[1]) / 2, viewBox.x[0], viewBox.x[1]);
    gliders.push({ id, on: curveOk(g.on) ? g.on : curves[0].id, x, label: plain(g.label, 20) });
  }
  const gliderIds = gliders.map((g) => g.id);

  const points: BoardPoint[] = [];
  for (const p of arr(raw.points, 10)) {
    if (points.length >= BOARD_CAPS.points || !isObj(p) || typeof p.id !== 'string' || !POINT_ID.test(p.id) || used.has(p.id)) continue;
    const at = pt(p.at) ?? [0, 0];
    const sumOf = Array.isArray(p.sumOf) && p.sumOf.length === 2 && p.sumOf.every((i) => typeof i === 'string' && points.some((q) => q.id === i)) ? (p.sumOf as [string, string]) : undefined;
    used.add(p.id);
    points.push({ id: p.id, at, ...(p.draggable === true && !sumOf ? { draggable: true } : {}), label: plain(p.label, 20), ...(sumOf ? { sumOf } : {}) });
  }
  const pointIds = points.map((p) => p.id);

  const ref = (v: unknown): Ref | null => (typeof v === 'string' ? (pointIds.includes(v) || gliderIds.includes(v) ? v : null) : pt(v));
  const vectors: BoardSpec['vectors'] = [];
  for (const v of arr(raw.vectors, 8)) {
    if (vectors.length >= BOARD_CAPS.vectors || !isObj(v)) continue;
    const from = ref(v.from);
    const to = ref(v.to);
    if (from && to) vectors.push({ from, to, label: plain(v.label, 20), ...(v.dashed === true ? { dashed: true } : {}) });
  }

  const polygons: BoardSpec['polygons'] = [];
  for (const p of arr(raw.polygons, 4)) {
    if (polygons.length >= BOARD_CAPS.polygons || !isObj(p) || !Array.isArray(p.points)) continue;
    const ids = p.points.slice(0, 6);
    if (ids.length >= 3 && ids.every((i) => typeof i === 'string' && pointIds.includes(i))) polygons.push({ points: ids as string[] });
  }
  const angles: BoardSpec['angles'] = [];
  for (const a of arr(raw.angles, 4)) {
    if (angles.length >= BOARD_CAPS.angles || !isObj(a) || !Array.isArray(a.points) || a.points.length !== 3) continue;
    if (a.points.every((i) => typeof i === 'string' && pointIds.includes(i))) angles.push({ points: a.points as [string, string, string] });
  }
  const texts: BoardSpec['texts'] = [];
  for (const t of arr(raw.texts, 6)) {
    if (texts.length >= BOARD_CAPS.texts || !isObj(t)) continue;
    const at = pt(t.at);
    const text = plain(t.text, 60);
    if (at && text) texts.push({ at, text });
  }

  const tangents = arr(raw.tangents, 4).flatMap((t) => (isObj(t) && typeof t.at === 'string' && gliderIds.includes(t.at) ? [{ at: t.at }] : [])).slice(0, BOARD_CAPS.tangents);
  const secants: BoardSpec['secants'] = [];
  for (const s of arr(raw.secants, 4)) {
    if (secants.length >= BOARD_CAPS.secants || !isObj(s) || typeof s.from !== 'string' || !gliderIds.includes(s.from)) continue;
    const hn = typeof s.h === 'string' && names.includes(s.h) ? s.h : null;
    const hv = num(s.h);
    if (hn) secants.push({ from: s.from, h: hn });
    else if (hv !== null && hv !== 0) secants.push({ from: s.from, h: clamp(hv, -10, 10) });
  }

  const bounds = (o: Record<string, unknown>): [number, number] | null => {
    const a = num(o.from);
    const b = num(o.to);
    return a !== null && b !== null && a < b ? [clamp(a, -1000, 1000), clamp(b, -1000, 1000)] : null;
  };
  let riemann: BoardSpec['riemann'];
  if (isObj(raw.riemann) && curveOk(raw.riemann.curve)) {
    const b = bounds(raw.riemann);
    const nName = typeof raw.riemann.n === 'string' && names.includes(raw.riemann.n) ? raw.riemann.n : null;
    const nVal = num(raw.riemann.n);
    const kind = raw.riemann.kind === 'right' || raw.riemann.kind === 'middle' ? raw.riemann.kind : 'left';
    if (b && (nName || nVal !== null)) riemann = { curve: raw.riemann.curve, from: b[0], to: b[1], n: nName ?? Math.round(clamp(nVal!, 1, 200)), kind };
  }
  let area: BoardSpec['area'];
  if (isObj(raw.area) && curveOk(raw.area.curve)) {
    const b = bounds(raw.area);
    if (b) area = { curve: raw.area.curve, from: b[0], to: b[1] };
  }
  const uc = isObj(raw.unitCircle) && typeof raw.unitCircle.angle === 'string' && names.includes(raw.unitCircle.angle) ? { angle: raw.unitCircle.angle } : undefined;

  const readouts: BoardReadout[] = [];
  for (const r of arr(raw.readouts, 10)) {
    if (readouts.length >= BOARD_CAPS.readouts || !isObj(r) || !READOUT_KINDS.includes(r.kind as ReadoutKind)) continue;
    const kind = r.kind as ReadoutKind;
    const label = plain(r.label, 40);
    const rf = typeof r.ref === 'string' ? r.ref : undefined;
    const valid =
      kind === 'param' ? !!rf && names.includes(rf)
      : kind === 'x' || kind === 'y' ? !!rf && (pointIds.includes(rf) || gliderIds.includes(rf))
      : kind === 'slope' || kind === 'secant' ? !!rf && gliderIds.includes(rf)
      : kind === 'riemann' ? !!riemann
      : kind === 'integral' ? !!riemann || !!area
      : kind === 'sin' || kind === 'cos' ? !!uc
      : kind === 'angle' ? rf !== undefined && Number(rf) < angles.length
      : rf !== undefined && Number(rf) < vectors.length;
    if (label && valid) readouts.push({ label, kind, ...(rf ? { ref: rf } : {}) });
  }

  if (!curves.length && !points.length && !uc) return null;
  return {
    ...(recipe ? { recipe } : {}),
    learningGoal: plain(raw.learningGoal, 140) ?? '',
    instruction: plain(raw.instruction, 200) ?? '',
    viewBox, sliders, curves, gliders, tangents, secants,
    ...(riemann ? { riemann } : {}), ...(area ? { area } : {}),
    points, vectors, polygons, angles, texts,
    ...(uc ? { unitCircle: uc } : {}), readouts,
  };
}

/** Sanitizes the board inside an AI-produced material in place; a bad board is deleted, never fatal. */
export function sanitizeMaterialBoard(material: unknown, language: 'id' | 'en' = 'id'): void {
  if (!isObj(material) || !('interactiveBoard' in material)) return;
  let input: Record<string, unknown> | null = isObj(material.interactiveBoard) ? { ...material.interactiveBoard, lang: language } : null;
  // A recipe reference without a curve would silently study x^2: borrow the curve the video plots.
  const hint = exprFromScript(material.videoScript);
  if (input && hint && input.recipe && !(isObj(input.params) && typeof input.params.expr === 'string' && compileExpr(input.params.expr))) {
    input = { ...input, params: { ...(isObj(input.params) ? input.params : {}), expr: hint } };
  }
  const clean = sanitizeBoardSpec(input);
  if (clean) material.interactiveBoard = clean;
  else delete material.interactiveBoard;
}

const squash = (s?: string) => (s ?? '').replace(/\s/g, '');

/** The board a lesson shows: its own, unless it is the baked-in x^2 default while the video plots another curve (older cached lessons). */
export function boardForLesson(
  material: { interactiveBoard?: BoardSpec; videoScript?: unknown },
  text: string,
  lang: 'id' | 'en' = 'id',
): BoardSpec | null {
  const hint = exprFromScript(material.videoScript);
  const own = material.interactiveBoard;
  const stale = !!own && !!hint && squash(own.curves?.[0]?.expr) === 'x^2' && squash(hint) !== 'x^2';
  if (own && !stale) return own;
  return fallbackBoardSpec(text, lang, hint) ?? own ?? null;
}

// ── Recipes ───────────────────────────────────────────────────────

type Text2 = Record<'id' | 'en', string>;
const T = (id: string, en: string): Text2 => ({ id, en });
const numParam = (p: Record<string, unknown>, k: string, d: number) => num(p[k]) ?? d;
const exprParam = (p: Record<string, unknown>, d: string) => (typeof p.expr === 'string' && compileExpr(p.expr) ? p.expr.trim() : d);

/** Window for a curve the lesson named, so sin(x) is not squeezed into a box made for x^2. */
function viewFor(expr: string, x: [number, number]): { x: [number, number]; y: [number, number] } {
  const f = compileExpr(expr);
  return { x, y: f ? fitRange((v) => f(v), x) : [-2, 9] };
}

function recipeBoard(name: BoardRecipe, p: Record<string, unknown>, lang: 'id' | 'en'): Record<string, unknown> {
  const L = (t: Text2) => t[lang];
  const x0 = numParam(p, 'x0', 1);
  const expr = exprParam(p, 'x^2');
  switch (name) {
    case 'derivative-tangent':
      return {
        learningGoal: L(T('Memahami turunan sebagai kemiringan garis singgung di satu titik.', 'See the derivative as the slope of the tangent line at one point.')),
        instruction: L(T('Geser titik P sepanjang kurva dan amati kemiringan garis singgung.', 'Drag point P along the curve and watch the slope of the tangent line.')),
        viewBox: typeof p.expr === 'string' && expr === p.expr.trim() ? viewFor(expr, defaultX(expr)) : { x: [-4, 4], y: [-2, 9] },
        curves: [{ expr, label: 'f(x)' }],
        gliders: [{ id: 'P', on: 'f', x: x0 }],
        tangents: [{ at: 'P' }],
        readouts: [
          { label: L(T('Posisi x', 'Position x')), kind: 'x', ref: 'P' },
          { label: L(T('Nilai f(x)', 'Value f(x)')), kind: 'y', ref: 'P' },
          { label: L(T('Kemiringan garis singgung', 'Tangent slope')), kind: 'slope', ref: 'P' },
        ],
      };
    case 'secant-tangent':
      return {
        learningGoal: L(T('Melihat garis potong mendekati garis singgung ketika h mengecil.', 'Watch the secant line approach the tangent line as h shrinks.')),
        instruction: L(T('Kecilkan h dan amati garis potong berubah menjadi garis singgung.', 'Make h smaller and watch the secant line turn into the tangent line.')),
        viewBox: typeof p.expr === 'string' && expr === p.expr.trim() ? viewFor(expr, /sin|cos|tan/.test(expr) ? [-6, 6] : [-1, 5]) : { x: [-1, 5], y: [-2, 12] },
        sliders: [{ name: 'h', label: 'h', min: 0.05, max: 3, step: 0.05, initial: 2 }],
        curves: [{ expr, label: 'f(x)' }],
        gliders: [{ id: 'P', on: 'f', x: x0 }],
        tangents: [{ at: 'P' }],
        secants: [{ from: 'P', h: 'h' }],
        readouts: [
          { label: L(T('Nilai h', 'Value of h')), kind: 'param', ref: 'h' },
          { label: L(T('Kemiringan garis potong', 'Secant slope')), kind: 'secant', ref: 'P' },
          { label: L(T('Kemiringan garis singgung', 'Tangent slope')), kind: 'slope', ref: 'P' },
        ],
      };
    case 'riemann-sum': {
      const from = numParam(p, 'from', 0);
      const to = numParam(p, 'to', 2);
      return {
        learningGoal: L(T('Memahami integral sebagai jumlah luas persegi panjang yang makin rapat.', 'See the integral as the total area of ever thinner rectangles.')),
        instruction: L(T('Naikkan n dan amati jumlah luas mendekati luas di bawah kurva.', 'Raise n and watch the total area approach the area under the curve.')),
        viewBox: typeof p.expr === 'string' && expr === p.expr.trim() ? viewFor(expr, [Math.min(-1, from - 1), Math.max(4, to + 1)]) : { x: [Math.min(-1, from - 1), Math.max(4, to + 1)], y: [-1, 6] },
        sliders: [{ name: 'n', label: 'n', min: 1, max: 50, step: 1, initial: 4 }],
        curves: [{ expr, label: 'f(x)' }],
        riemann: { curve: 'f', from, to, n: 'n', kind: 'left' },
        readouts: [
          { label: L(T('Jumlah persegi panjang (n)', 'Rectangles (n)')), kind: 'param', ref: 'n' },
          { label: L(T('Jumlah Riemann', 'Riemann sum')), kind: 'riemann' },
          { label: L(T('Luas sebenarnya', 'Exact area')), kind: 'integral' },
        ],
      };
    }
    case 'vector-addition':
      return {
        learningGoal: L(T('Melihat penjumlahan vektor sebagai ujung bertemu pangkal.', 'See vector addition as placing one arrow at the tip of the other.')),
        instruction: L(T('Geser ujung vektor a dan b, lalu amati hasil penjumlahannya.', 'Drag the tips of vectors a and b and watch the resultant.')),
        viewBox: { x: [-1, 8], y: [-1, 7] },
        points: [
          { id: 'O', at: [0, 0] },
          { id: 'A', at: [3, 1], draggable: true },
          { id: 'B', at: [1, 3], draggable: true },
          { id: 'S', at: [4, 4], sumOf: ['A', 'B'] },
        ],
        vectors: [
          { from: 'O', to: 'A', label: 'a' },
          { from: 'O', to: 'B', label: 'b' },
          { from: 'A', to: 'S', dashed: true },
          { from: 'O', to: 'S', label: 'a + b' },
        ],
        readouts: [
          { label: L(T('Hasil, komponen x', 'Resultant, x component')), kind: 'x', ref: 'S' },
          { label: L(T('Hasil, komponen y', 'Resultant, y component')), kind: 'y', ref: 'S' },
          { label: L(T('Panjang hasil', 'Resultant length')), kind: 'length', ref: '3' },
        ],
      };
    case 'unit-circle':
      return {
        learningGoal: L(T('Menghubungkan sudut dengan nilai sinus dan kosinus pada lingkaran satuan.', 'Connect an angle to its sine and cosine on the unit circle.')),
        instruction: L(T('Putar sudut dan amati nilai sin dan cos berubah.', 'Turn the angle and watch sin and cos change.')),
        viewBox: { x: [-1.6, 1.6], y: [-1.6, 1.6] },
        sliders: [{ name: 't', label: L(T('Sudut (derajat)', 'Angle (degrees)')), min: 0, max: 360, step: 1, initial: 45 }],
        unitCircle: { angle: 't' },
        readouts: [
          { label: L(T('Sudut (derajat)', 'Angle (degrees)')), kind: 'param', ref: 't' },
          { label: 'sin', kind: 'sin', ref: 't' },
          { label: 'cos', kind: 'cos', ref: 't' },
        ],
      };
    case 'function-transform': {
      const base = exprParam(p, 'x^2');
      const shifted = `a*(${base.replace(/\bx\b/g, '(x-b)')})+k`;
      return {
        learningGoal: L(T('Memahami cara a, b, dan k menggeser dan meregangkan grafik fungsi.', 'Understand how a, b and k shift and stretch a function graph.')),
        instruction: L(T('Ubah a, b, dan k dan bandingkan dengan grafik putus-putus.', 'Change a, b and k and compare with the dashed graph.')),
        viewBox: { x: [-6, 6], y: [-6, 8] },
        sliders: [
          { name: 'a', label: L(T('a (regangan vertikal)', 'a (vertical stretch)')), min: -3, max: 3, step: 0.1, initial: 1 },
          { name: 'b', label: L(T('b (geser horizontal)', 'b (horizontal shift)')), min: -4, max: 4, step: 0.1, initial: 0 },
          { name: 'k', label: L(T('k (geser vertikal)', 'k (vertical shift)')), min: -4, max: 4, step: 0.1, initial: 0 },
        ],
        curves: [{ expr: base, label: 'f(x)', dashed: true }, { expr: shifted, label: 'g(x)' }],
        readouts: [
          { label: 'a', kind: 'param', ref: 'a' },
          { label: 'b', kind: 'param', ref: 'b' },
          { label: 'k', kind: 'param', ref: 'k' },
        ],
      };
    }
    case 'quadratic-explorer':
      return {
        learningGoal: L(T('Melihat pengaruh a, b, dan c pada bentuk parabola.', 'See how a, b and c shape a parabola.')),
        instruction: L(T('Ubah a, b, dan c, lalu geser titik P untuk membaca koordinatnya.', 'Change a, b and c, then drag point P to read its coordinates.')),
        viewBox: { x: [-6, 6], y: [-8, 10] },
        sliders: [
          { name: 'a', label: 'a', min: -3, max: 3, step: 0.1, initial: 1 },
          { name: 'b', label: 'b', min: -6, max: 6, step: 0.1, initial: 0 },
          { name: 'c', label: 'c', min: -6, max: 6, step: 0.1, initial: 0 },
        ],
        curves: [{ expr: 'a*x^2+b*x+c', label: 'f(x)' }],
        gliders: [{ id: 'P', on: 'f', x: 2 }],
        readouts: [
          { label: L(T('Posisi x', 'Position x')), kind: 'x', ref: 'P' },
          { label: L(T('Nilai f(x)', 'Value f(x)')), kind: 'y', ref: 'P' },
        ],
      };
  }
}

/** A recipe board, validated through the same path as AI output. */
export function boardFromRecipe(name: BoardRecipe, params: Record<string, unknown> = {}, lang: 'id' | 'en' = 'id'): BoardSpec {
  return sanitizeBoardSpec({ recipe: name, params, lang })!;
}

// ── Keyword fallback ──────────────────────────────────────────────

const KEYWORDS: [RegExp, BoardRecipe][] = [
  [/limit|garis potong|secant/i, 'secant-tangent'],
  [/integral|riemann|luas daerah|area under|antiderivative|antiturunan/i, 'riemann-sum'],
  [/turunan|derivative|gradien|slope|singgung|tangent|diferensial|kalkulus|calculus/i, 'derivative-tangent'],
  [/vektor|vector/i, 'vector-addition'],
  [/trigonometri|trigonometry|sinus|cosinus|sine|cosine|lingkaran satuan|unit circle/i, 'unit-circle'],
  [/transformasi|transformation|translasi|pergeseran|dilatasi/i, 'function-transform'],
  [/kuadrat|parabola|quadratic|polinomial|polynomial/i, 'quadratic-explorer'],
];

/** Recipe for a math topic by keyword, or null when the text is not recognisably about one of them. */
export function pickBoardRecipe(text: string): BoardRecipe | null {
  for (const [re, recipe] of KEYWORDS) if (re.test(text)) return recipe;
  return /matematika|mathematics|\bmath\b/i.test(text) && /fungsi|function|aljabar|algebra/i.test(text) ? 'function-transform' : null;
}

/** The first curve the video scenes plot, so the board studies the same function the lesson is about. */
export function exprFromScript(script: unknown): string | undefined {
  const scenes = isObj(script) && Array.isArray(script.scenes) ? script.scenes : [];
  for (const sc of scenes) {
    const params = isObj(sc) && isObj(sc.recipe) && isObj(sc.recipe.params) ? sc.recipe.params : null;
    if (params && typeof params.expr === 'string' && compileExpr(params.expr)) return params.expr.trim();
  }
  return undefined;
}

export function fallbackBoardSpec(text: string, lang: 'id' | 'en' = 'id', expr?: string): BoardSpec | null {
  const r = pickBoardRecipe(text);
  if (!r) return null;
  // Only the function recipes take an expression; the others ignore it.
  return boardFromRecipe(r, expr && ['derivative-tangent', 'secant-tangent', 'riemann-sum'].includes(r) ? { expr } : {}, lang);
}
