/* eslint-disable @typescript-eslint/no-explicit-any -- JSXGraph's element types are loose; the BoardSpec has already been validated */
// Builds a JSXGraph board from a validated BoardSpec. Browser only (JSXGraph touches window on import).
import JXG from 'jsxgraph';
import { compileExpr } from '@/lib/learn/math-spec';
import type { BoardSpec } from '@/lib/learn/board-spec';

export interface BoardTokens { ink: string; amber: string; muted: string; grid: string }
export interface BoardLive {
  readouts: string[];
  gliderX: Record<string, number>;
  pointXY: Record<string, [number, number]>;
}
export interface BuiltBoard {
  compute: () => BoardLive;
  moveGlider: (id: string, x: number) => void;
  movePoint: (id: string, x: number, y: number) => void;
  /** Re-evaluates every formula after a slider changed. */
  refresh: () => void;
  onUpdate: (cb: () => void) => void;
  dispose: () => void;
}

/** Reads the design tokens as concrete colour strings (JSXGraph paints SVG attributes, not CSS variables). */
export function readTokens(el: Element): BoardTokens {
  const css = getComputedStyle(el);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return { ink: get('--pj-ink', 'currentColor'), amber: get('--pj-amber', 'currentColor'), muted: get('--pj-text-muted', 'currentColor'), grid: get('--pj-surface-strong', 'currentColor') };
}

const RAD = Math.PI / 180;
const SLIDER_HIT = { touch: 22, mouse: 6, pen: 12 }; // radius in px: a 44 px touch target

export function buildBoard(
  el: HTMLElement,
  spec: BoardSpec,
  params: Record<string, number>,
  tk: BoardTokens,
  format: (v: number) => string,
): BuiltBoard {
  const { x: vx, y: vy } = spec.viewBox;
  const square = Boolean(spec.unitCircle || spec.angles.length || spec.polygons.length);
  const board: any = JXG.JSXGraph.initBoard(el, {
    boundingbox: [vx[0], vy[1], vx[1], vy[0]],
    axis: false,
    grid: false,
    showCopyright: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { enabled: false },
    keepAspectRatio: square,
    resize: { enabled: true, throttle: 40 },
    defaultAxes: {},
  } as any);

  // JSXGraph locks the whole board against touch scrolling. Hand the vertical swipe back to the page and
  // keep the lock only on the handles (see halo below), so a finger on empty board still scrolls.
  el.style.touchAction = 'pan-y';
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const common = { fixed: true, highlight: false, withLabel: false };
  board.create('grid', [], { ...common, strokeColor: tk.grid, strokeOpacity: 1, strokeWidth: 1, majorStep: 1, minorElements: 0 } as any);
  const axisAttrs = {
    ...common,
    strokeColor: tk.ink,
    strokeOpacity: 0.55,
    strokeWidth: 1.5,
    ticks: { insertTicks: true, minorTicks: 0, strokeColor: tk.ink, strokeOpacity: 0.45, drawZero: false, label: { strokeColor: tk.muted, fontSize: 12 } },
  };
  board.create('axis', [[0, 0], [1, 0]], axisAttrs);
  board.create('axis', [[0, 0], [0, 1]], axisAttrs);

  // Curves read the slider values live, so board.fullUpdate() is all a slider change needs.
  const fns: Record<string, (x: number) => number> = {};
  const curves: Record<string, any> = {};
  const names = spec.sliders.map((s) => s.name as string);
  spec.curves.forEach((c, i) => {
    const compiled = compileExpr(c.expr, names)!;
    fns[c.id] = (x) => compiled(x, params);
    curves[c.id] = board.create('functiongraph', [fns[c.id]], {
      ...common,
      strokeColor: c.dashed ? tk.muted : [tk.ink, tk.amber, tk.muted][i % 3],
      strokeWidth: 2.5,
      dash: c.dashed ? 2 : 0,
    });
  });

  const point = (extra: Record<string, unknown>) => ({
    fillColor: tk.amber, strokeColor: tk.ink, strokeWidth: 1.5, highlightFillColor: tk.amber, highlightStrokeColor: tk.ink,
    showInfobox: false, precision: SLIDER_HIT, label: { offset: [10, 10], strokeColor: tk.ink, fontSize: 14 }, ...extra,
  });

  const objs: Record<string, any> = {}; // glider and point objects by id
  const gliderCurve: Record<string, string> = {};
  for (const g of spec.gliders) {
    const y = fns[g.on](g.x);
    objs[g.id] = board.create('glider', [g.x, Number.isFinite(y) ? y : 0, curves[g.on]], point({ name: g.label ?? g.id, size: 6, withLabel: true }));
    gliderCurve[g.id] = g.on;
  }
  for (const p of spec.points) {
    const parts = p.sumOf ? p.sumOf.map((id) => objs[id]) : null;
    const coords = parts ? [() => parts[0].X() + parts[1].X(), () => parts[0].Y() + parts[1].Y()] : p.at;
    objs[p.id] = board.create('point', coords, point({
      name: p.label ?? p.id,
      fixed: !p.draggable,
      size: p.draggable ? 6 : 3,
      withLabel: Boolean(p.label),
      fillColor: p.draggable ? tk.amber : tk.ink,
      highlight: Boolean(p.draggable),
    }));
  }
  // A soft ring around each draggable handle: it shows where to grab, and is the one place that blocks page scroll.
  for (const h of [...spec.gliders.map((g) => objs[g.id]), ...spec.points.filter((p) => p.draggable).map((p) => objs[p.id])]) {
    const ring = board.create('point', [() => h.X(), () => h.Y()], {
      ...common, name: '', size: coarse ? SLIDER_HIT.touch : 11, fillColor: tk.amber, fillOpacity: 0.28, strokeWidth: 0, layer: 6, showInfobox: false,
    });
    if (ring.rendNode) (ring.rendNode as SVGElement).style.touchAction = 'none';
  }
  const endpoint = (r: string | [number, number]) => (typeof r === 'string' ? objs[r] : r);

  for (const t of spec.tangents) {
    board.create('tangent', [objs[t.at]], { ...common, strokeColor: tk.amber, strokeWidth: 2.5 });
  }
  const secantH = (h: string | number) => (typeof h === 'string' ? params[h] : h);
  for (const s of spec.secants) {
    const from = objs[s.from];
    const f = fns[gliderCurve[s.from]];
    const q = board.create('point', [() => from.X() + secantH(s.h), () => f(from.X() + secantH(s.h))], { ...common, size: 3, fillColor: tk.muted, strokeColor: tk.muted });
    board.create('line', [from, q], { ...common, strokeColor: tk.muted, strokeWidth: 2, dash: 2 });
  }

  let riemann: any;
  if (spec.riemann) {
    const r = spec.riemann;
    riemann = board.create('riemannsum', [fns[r.curve], () => (typeof r.n === 'string' ? Math.round(params[r.n]) : r.n), r.kind, r.from, r.to], {
      ...common, fillColor: tk.amber, fillOpacity: 0.35, strokeColor: tk.ink, strokeWidth: 1,
    });
  }
  if (spec.area) {
    const a = spec.area;
    board.create('integral', [[a.from, a.to], curves[a.curve]], {
      ...common, fillColor: tk.amber, fillOpacity: 0.35, label: { visible: false },
      curveLeft: { visible: false }, curveRight: { visible: false },
    } as any);
  }
  const integral = () => {
    const b = spec.riemann ?? spec.area;
    if (!b) return NaN;
    return (JXG as any).Math.Numerics.I([b.from, b.to], fns[b.curve]);
  };

  for (const poly of spec.polygons) {
    board.create('polygon', poly.points.map((id) => objs[id]), {
      ...common, fillColor: tk.ink, fillOpacity: 0.06, strokeColor: tk.ink, strokeWidth: 2, vertices: { visible: false }, hasInnerPoints: false,
    });
  }
  const angles = spec.angles.map((a) =>
    board.create('angle', a.points.map((id) => objs[id]), { ...common, radius: 0.7, fillColor: tk.amber, fillOpacity: 0.4, strokeColor: tk.amber, selection: false }),
  );

  const vecEnds: [any, any][] = [];
  for (const v of spec.vectors) {
    const a = endpoint(v.from);
    const b = endpoint(v.to);
    vecEnds.push([a, b]);
    const sum = typeof v.to === 'string' && spec.points.find((p) => p.id === v.to)?.sumOf && typeof v.from === 'string' && v.from === 'O';
    board.create('arrow', [a, b], { ...common, strokeColor: sum ? tk.amber : tk.ink, strokeWidth: 2.5, dash: v.dashed ? 2 : 0 });
    if (v.label) {
      const px = (p: any) => (Array.isArray(p) ? p[0] : p.X());
      const py = (p: any) => (Array.isArray(p) ? p[1] : p.Y());
      board.create('text', [() => (px(a) + px(b)) / 2, () => (py(a) + py(b)) / 2, v.label], { ...common, display: 'internal', fontSize: 14, strokeColor: tk.ink, anchorX: 'middle', anchorY: 'bottom' });
    }
  }
  const coord = (p: any): [number, number] => (Array.isArray(p) ? [p[0], p[1]] : [p.X(), p.Y()]);

  for (const t of spec.texts) {
    board.create('text', [t.at[0], t.at[1], t.text], { ...common, display: 'internal', fontSize: 14, strokeColor: tk.ink });
  }

  const deg = () => (spec.unitCircle ? params[spec.unitCircle.angle] : 0);
  if (spec.unitCircle) {
    const origin = board.create('point', [0, 0], { ...common, visible: false });
    const tip = board.create('point', [() => Math.cos(deg() * RAD), () => Math.sin(deg() * RAD)], point({ name: '', size: 6, fixed: true, highlight: false, withLabel: false }));
    const foot = board.create('point', [() => Math.cos(deg() * RAD), 0], { ...common, visible: false });
    board.create('circle', [origin, 1], { ...common, strokeColor: tk.ink, strokeWidth: 2, fillColor: 'none' });
    board.create('segment', [origin, tip], { ...common, strokeColor: tk.ink, strokeWidth: 2 });
    board.create('segment', [foot, tip], { ...common, strokeColor: tk.amber, strokeWidth: 3 });
    board.create('segment', [origin, foot], { ...common, strokeColor: tk.muted, strokeWidth: 3 });
    board.create('arc', [origin, [0.35, 0], tip], { ...common, radius: 0.35, strokeColor: tk.amber, strokeWidth: 2 } as any);
    board.create('text', [() => Math.cos(deg() * RAD) + 0.06, () => Math.sin(deg() * RAD) / 2, 'sin'], { ...common, display: 'internal', fontSize: 13, strokeColor: tk.ink });
    board.create('text', [() => Math.cos(deg() * RAD) / 2, -0.12, 'cos'], { ...common, display: 'internal', fontSize: 13, strokeColor: tk.ink, anchorX: 'middle', anchorY: 'top' });
  }

  const derivative = (id: string) => {
    const f = fns[gliderCurve[id]];
    const x = objs[id].X();
    const h = 1e-4 * Math.max(1, Math.abs(x));
    return (f(x + h) - f(x - h)) / (2 * h);
  };

  const compute = (): BoardLive => ({
    readouts: spec.readouts.map((r) => {
      const ref = r.ref ?? '';
      let v = NaN;
      switch (r.kind) {
        case 'param': v = params[ref]; break;
        case 'x': v = objs[ref].X(); break;
        case 'y': v = objs[ref].Y(); break;
        case 'slope': v = derivative(ref); break;
        case 'secant': {
          const s = spec.secants.find((q) => q.from === ref);
          const f = fns[gliderCurve[ref]];
          const x = objs[ref].X();
          if (s) v = (f(x + secantH(s.h)) - f(x)) / secantH(s.h);
          break;
        }
        case 'riemann': v = riemann?.Value(); break;
        case 'integral': v = integral(); break;
        case 'sin': v = Math.sin(deg() * RAD); break;
        case 'cos': v = Math.cos(deg() * RAD); break;
        case 'angle': v = angles[Number(ref)]?.Value() / RAD; break;
        case 'length': {
          const e = vecEnds[Number(ref)];
          if (e) v = Math.hypot(coord(e[1])[0] - coord(e[0])[0], coord(e[1])[1] - coord(e[0])[1]);
          break;
        }
      }
      return Number.isFinite(v) ? format(v) : '-';
    }),
    gliderX: Object.fromEntries(spec.gliders.map((g) => [g.id, objs[g.id].X()])),
    pointXY: Object.fromEntries(spec.points.filter((p) => p.draggable).map((p) => [p.id, [objs[p.id].X(), objs[p.id].Y()]])),
  });

  let listener: (() => void) | undefined;
  return {
    compute,
    moveGlider: (id, x) => {
      const y = fns[gliderCurve[id]]?.(x);
      if (objs[id] && Number.isFinite(y)) objs[id].moveTo([x, y], 0);
    },
    movePoint: (id, x, y) => objs[id]?.moveTo([x, y], 0),
    refresh: () => {
      board.fullUpdate();
      listener?.();
    },
    onUpdate: (cb) => {
      listener = cb;
      board.on('update', cb);
    },
    dispose: () => JXG.JSXGraph.freeBoard(board),
  };
}
