// ================================================================
// PIJAR - Stage engine: maps the scene DSL onto manim-web objects.
// manim-web's scene.play() runs on its own real-time clock, so it
// cannot seek or follow a player. This engine builds the mobjects,
// then drives manim-web's Animation classes itself (begin, interpolate,
// finish) from a time value the player passes in. Going forward is
// incremental; going backward rebuilds the scene and fast-forwards,
// so seeking is exact and the timeline UI stays honest.
// ================================================================

import {
  Scene, Text, MathTex, Axes, Group, VGroup, Line, DashedLine, Arrow, Dot, Circle, Rectangle, RoundedRectangle,
  Polygon, NumberLine, BraceBetweenPoints, FadeIn, FadeOut, Create, Write, Transform, GrowArrow, ApplyMatrix,
  type Animation, type Mobject, type FunctionGraph,
} from 'manim-web';
import { compileExpr } from '@/lib/learn/math-spec';
import {
  STAGE_H, STAGE_W, type Pt, type StageObject, type StageSpec, type TextSize, type TimelineEntry,
} from '@/lib/learn/scene-dsl';
import { mix, type StageTheme } from './stage-theme';

type V3 = [number, number, number];
const v3 = (p: Pt): V3 => [p[0], p[1], 0];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number) => a * a * (3 - 2 * a);
const SIZES: Record<TextSize, number> = { sm: 26, md: 34, lg: 46, xl: 64 };
/** Narrow stages (phones): enlarged type so that smallest code/body text is >= 11px on 390px screens. */
const COMPACT_SIZES: Record<TextSize, number> = { sm: 64, md: 72, lg: 82, xl: 96 };

interface Rec {
  spec: StageObject;
  mob: Mobject | null;
  /** function-graph: the sampled function. */
  fn?: (x: number) => number;
  /** boxes: the pieces, so highlight can recolor the frame only. */
  rect?: RoundedRectangle;
  line?: Line;
  dot?: Dot;
  children?: string[];
  color: string;
  fill?: string;
}

/** Something the timeline can drive. */
interface Driver {
  begin(): void;
  at(alpha: number): void;
  end(): void;
  remove?: Mobject[];
}

function wrap(a: Animation, linear: boolean): Driver {
  return {
    begin: () => a.begin(),
    at: (al) => a.interpolate(linear ? al : a.rateFunc(al)),
    end: () => a.finish(),
    remove: a.remover ? [a.mobject] : undefined,
  };
}

interface Run {
  entry: TimelineEntry;
  start: number;
  end: number;
  state: 'idle' | 'running' | 'done';
  drivers: Driver[];
}

export class StageEngine {
  private scene: Scene;
  private recs = new Map<string, Rec>();
  private runs: Run[] = [];
  private shown = new Set<Mobject>();
  private stage: StageSpec | null = null;
  private scale = 1;
  private compact = false;
  private lastT = -1;
  private wantT = 0;
  private loading = false;
  private epoch = 0;
  private disposed = false;

  private constructor(private container: HTMLElement, private theme: StageTheme) {
    this.scene = new Scene(container, {
      backgroundColor: theme.bg,
      frameWidth: STAGE_W,
      frameHeight: STAGE_H,
      targetFps: 60,
    });
  }

  /** Throws when WebGL is unavailable; the caller shows the static fallback. */
  static create(container: HTMLElement, theme: StageTheme): StageEngine {
    return new StageEngine(container, theme);
  }

  // ── build ───────────────────────────────────────────────────────

  async load(stage: StageSpec, scale: number, compact = false): Promise<void> {
    this.stage = stage;
    this.compact = compact;
    this.scale = scale;
    this.loading = true;
    try {
      await this.rebuild();
    } finally {
      this.loading = false;
    }
    this.advance(this.wantT);
  }

  private rebuild(): Promise<void> {
    const my = ++this.epoch;
    const job = (async () => {
      const recs = this.buildAll(this.stage!);
      // Wait for typeset math before swapping, so a reset never flashes empty formulas.
      const waits: Promise<void>[] = [];
      for (const r of recs.values()) if (r.mob instanceof MathTex) waits.push(r.mob.waitForRender().catch(() => undefined));
      await Promise.all(waits);
      if (this.disposed || my !== this.epoch) return;
      this.scene.clear({ render: false });
      for (const r of this.recs.values()) r.mob?.dispose?.();
      this.recs = recs;
      this.shown.clear();
      this.runs = this.stage!.timeline.map((entry) => ({
        entry,
        start: entry.at * this.scale,
        end: (entry.at + entry.dur) * this.scale,
        state: 'idle' as const,
        drivers: [],
      }));
      this.lastT = -1;
      this.scene.render();
    })();
    return job;
  }

  private ptOf(rec: Rec | undefined, p: Pt | string, axesId?: string): V3 {
    if (typeof p === 'string') {
      const d = this.recs.get(p);
      const c = d?.mob?.getCenter();
      return c ? [c[0], c[1], 0] : [0, 0, 0];
    }
    void rec;
    if (axesId) {
      const ax = this.recs.get(axesId)?.mob as Axes | undefined;
      if (ax) {
        const q = ax.c2p(p[0], p[1]);
        return [q[0], q[1], 0];
      }
    }
    return v3(p);
  }

  private get sizes() {
    return this.compact ? COMPACT_SIZES : SIZES;
  }

  private text(text: string, size: TextSize, color: string, opts: { mono?: boolean; weight?: number; scaleFont?: number; align?: 'left' | 'center' | 'right'; maxW?: number } = {}): Text {
    const make = (t: string) =>
      new Text({
        text: t,
        fontSize: Math.round(this.sizes[size] * (opts.scaleFont ?? 1)),
        color,
        fontFamily: opts.mono ? this.theme.fontMono : this.theme.fontBody,
        fontWeight: opts.weight ?? 400,
        textAlign: opts.align ?? 'center',
        lineHeight: 1.25,
      });
    const m = make(text);
    const maxW = opts.maxW;
    if (!maxW || m.getWidth() <= maxW || !/\s/.test(text)) return m;
    // Too wide for the room beside it: break at spaces into lines no wider than the room (measured per character).
    const perChar = m.getWidth() / text.length;
    const limit = Math.max(8, Math.floor(maxW / perChar));
    const lines: string[] = [];
    let cur = '';
    for (const w of text.split(/\s+/)) {
      if (cur && cur.length + 1 + w.length > limit) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) lines.push(cur);
    return make(lines.join('\n'));
  }

  /** Width available for a text anchored at x, so it never runs off the frame. */
  private roomFor(x: number, align: 'left' | 'center' | 'right' | undefined): number {
    const edge = STAGE_W / 2 - 0.4;
    if (align === 'left') return edge - x;
    if (align === 'right') return x + edge;
    return 2 * Math.min(edge - x, x + edge);
  }

  private buildAll(stage: StageSpec): Map<string, Rec> {
    const recs = new Map<string, Rec>();
    const saved = this.recs;
    this.recs = recs; // ptOf and the builders look up earlier objects here
    try {
      for (const o of stage.objects) {
        // Low-priority notes are too small to read on a phone; the player shows them under the stage instead.
        if (this.compact && 'priority' in o && o.priority === 'low') continue;
        try {
          const r = this.build(o);
          if (r) recs.set(o.id, r);
        } catch {
          // One object failing to build must not take the scene down.
        }
      }
    } finally {
      this.recs = saved;
    }
    return recs;
  }

  private col(c: string | undefined, fallback: keyof StageTheme['colors'] = 'off-white'): string {
    return this.theme.colors[(c as keyof StageTheme['colors']) ?? fallback] ?? this.theme.colors[fallback];
  }

  private build(o: StageObject): Rec | null {
    const T = this.theme;
    const color = this.col(('color' in o ? o.color : undefined) ?? undefined);
    switch (o.type) {
      case 'text': {
        const m = this.text(o.text, o.size ?? 'md', color, { mono: o.mono, align: o.align, maxW: this.roomFor(o.at[0], o.align) });
        m.moveTo(v3(o.at), o.align === 'left' ? [-1, 0, 0] : o.align === 'right' ? [1, 0, 0] : undefined);
        return { spec: o, mob: m, color };
      }
      case 'mathtex': {
        const m = new MathTex({ latex: o.latex, color, fontSize: this.sizes[o.size ?? 'md'] });
        m.moveTo(v3(o.at));
        return { spec: o, mob: m, color };
      }
      case 'axes': {
        const dec = (step: number) => (step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9)));
        const axisCfg = { includeNumbers: o.numbers !== false, numberFontSize: this.compact ? 34 : 20 };
        const xAxisConfig = { ...axisCfg, decimalPlaces: dec(o.xRange[2]) };
        // Number labels on the y axis sit right where curves cross it and collide; the ticks stay, the x labels carry the scale.
        const yAxisConfig = { ...axisCfg, includeNumbers: false, decimalPlaces: dec(o.yRange[2]) };
        const ax = new Axes({
          xRange: o.xRange, yRange: o.yRange, xLength: o.size[0], yLength: o.size[1], color,
          axisConfig: axisCfg, xAxisConfig, yAxisConfig, tips: true,
        });
        // Put the middle of the plotting area (not the group's box) at `at`.
        const c = ax.c2p((o.xRange[0] + o.xRange[1]) / 2, (o.yRange[0] + o.yRange[1]) / 2);
        ax.shift([o.at[0] - c[0], o.at[1] - c[1], 0]);
        if (o.xLabel || o.yLabel) {
          const labels = ax.getAxisLabels({ xLabel: o.xLabel, yLabel: o.yLabel });
          ax.add(labels);
        }
        return { spec: o, mob: ax, color };
      }
      case 'function-graph': {
        const ax = this.recs.get(o.axes)?.mob as Axes | undefined;
        const base = compileExpr(o.expr);
        if (!ax || !base) return null;
        const fn = o.derivative ? (x: number) => (base(x + 1e-3) - base(x - 1e-3)) / 2e-3 : base;
        const xr = ax.getXRange();
        const lo = o.xRange ? Math.max(o.xRange[0], xr[0]) : xr[0];
        const hi = o.xRange ? Math.min(o.xRange[1], xr[1]) : xr[1];
        // Poles (tan, 1/x): break the path where the curve leaps across the plot, and keep each branch inside the
        // plotting box so it never runs into the title or the labels.
        const yr = ax.getYRange();
        const span = yr[1] - yr[0];
        const cap = (v: number) => Math.max(yr[0] - span * 0.08, Math.min(yr[1] + span * 0.08, v));
        const breaks: number[] = [];
        const N = 600;
        for (let i = 0, prev = fn(lo); i < N; i++) {
          const x1 = lo + ((i + 1) / N) * (hi - lo);
          const v = fn(x1);
          if (!Number.isFinite(v) || !Number.isFinite(prev) || (Math.abs(v - prev) > span * 1.5)) breaks.push(x1 - (hi - lo) / N / 2);
          prev = v;
        }
        const g: FunctionGraph = ax.plot((x) => cap(fn(x)), { color, xRange: [lo, hi], strokeWidth: 8, numSamples: 160, discontinuities: breaks.slice(0, 24) });
        return { spec: o, mob: g, fn, color };
      }
      case 'vector': {
        const s = this.ptOf(undefined, o.from, o.axes);
        const e = this.ptOf(undefined, o.to, o.axes);
        const a = new Arrow({ start: s, end: e, color, strokeWidth: 5 });
        return { spec: o, mob: a, color };
      }
      case 'line': {
        const s = this.ptOf(undefined, o.from, o.axes);
        const e = this.ptOf(undefined, o.to, o.axes);
        const linked = typeof o.from === 'string' || typeof o.to === 'string';
        const l = o.dashed && !linked ? new DashedLine({ start: s, end: e, color, strokeWidth: 2.5 }) : new Line({ start: s, end: e, color, strokeWidth: o.dashed ? 2 : 3.5 });
        return { spec: o, mob: l, color };
      }
      case 'dot': {
        let p: V3 = [0, 0, 0];
        let fn: ((x: number) => number) | undefined;
        if (o.onGraph) {
          const g = this.recs.get(o.onGraph.graph);
          const ax = this.recs.get((g?.spec as { axes: string } | undefined)?.axes ?? '')?.mob as Axes | undefined;
          fn = g?.fn;
          if (ax && fn) p = this.ptOf(undefined, [o.onGraph.x, fn(o.onGraph.x)], (g!.spec as { axes: string }).axes);
        } else if (o.at) {
          p = this.ptOf(undefined, o.at, o.axes);
        }
        const d = new Dot({ point: p, radius: o.radius ?? 0.1, color, fillOpacity: o.hollow ? 0 : 1, strokeWidth: o.hollow ? 4 : 0 });
        return { spec: o, mob: d, color };
      }
      case 'circle': {
        const c = new Circle({ radius: o.radius, color, fillOpacity: o.fill ? 0.25 : 0, strokeWidth: 4, center: v3(o.at) });
        return { spec: o, mob: c, color };
      }
      case 'rectangle': {
        const r = new Rectangle({ width: o.size[0], height: o.size[1], color, fillOpacity: o.fill ? 0.28 : 0, strokeWidth: o.fill ? 0 : 3, center: v3(o.at) });
        return { spec: o, mob: r, color };
      }
      case 'polygon': {
        const p = new Polygon({ vertices: o.points.map(v3), color, fillOpacity: o.fill ? 0.3 : 0, strokeWidth: 4 });
        return { spec: o, mob: p, color };
      }
      case 'number-line': {
        const n = new NumberLine({ xRange: o.range, length: o.length, color, includeNumbers: o.numbers !== false, numberFontSize: this.compact ? 36 : 22 });
        n.moveTo(v3(o.at));
        return { spec: o, mob: n, color };
      }
      case 'brace': {
        const b = new BraceBetweenPoints({ start: v3(o.from), end: v3(o.to), color });
        const g = new Group(b);
        if (o.label) {
          const t = this.text(o.label, 'sm', color);
          const tip = b.getTip();
          const dx = tip[0] - (o.from[0] + o.to[0]) / 2;
          const dy = tip[1] - (o.from[1] + o.to[1]) / 2;
          const len = Math.hypot(dx, dy) || 1;
          t.moveTo([tip[0] + (dx / len) * 0.4, tip[1] + (dy / len) * 0.4, 0]);
          g.add(t);
        }
        return { spec: o, mob: g, color };
      }
      case 'box': {
        const [w, h] = o.size ?? [Math.max(2.2, o.label.length * 0.15 + 0.9), o.sub ? 0.95 : 0.8];
        const filled = !!o.fill;
        const stroke = color;
        const fill = filled ? color : T.panel;
        const rect = new RoundedRectangle({ width: w, height: h, cornerRadius: o.round ? 0.16 : 0.04, color: stroke, fillOpacity: 1, strokeWidth: 3.5, center: v3(o.at) });
        rect.setFill(fill, 1);
        const labelColor = filled ? T.onAmber : color;
        // On a phone a long label wraps onto two lines first, so shrinking it to fit costs less legibility.
        const label = this.text(o.label, 'sm', labelColor, { weight: 600, scaleFont: h < 0.7 ? 0.9 : 1, maxW: this.compact ? w - 0.3 : undefined });
        // A label wider than its box shrinks to fit instead of running over the edge.
        const fit = Math.min(1, (w - 0.3) / label.getWidth(), this.compact ? (h - 0.15) / label.getHeight() : 1);
        if (fit < 1) label.scale(fit);
        // A phone has no room for the second line: the label alone is kept, large enough to read.
        const sub1 = o.sub && !this.compact;
        const parts: Mobject[] = [rect];
        if (sub1 && o.sub) {
          const sub = this.text(o.sub, 'sm', filled ? T.onAmber : T.colors.muted, { scaleFont: 0.72 });
          if (sub.getWidth() > w - 0.3) sub.scale((w - 0.3) / sub.getWidth());
          const lH = label.getHeight();
          const sH = sub.getHeight();
          const gap = 0.08;
          const totalH = lH + sH + gap;
          const scaleToFit = totalH > h - 0.18 ? (h - 0.18) / totalH : 1;
          if (scaleToFit < 1) {
            label.scale(scaleToFit);
            sub.scale(scaleToFit);
          }
          const finalLH = label.getHeight();
          const finalSH = sub.getHeight();
          const top = o.at[1] + (finalLH + finalSH + gap) / 2;
          label.moveTo([o.at[0], top - finalLH / 2, 0]);
          sub.moveTo([o.at[0], top - finalLH - gap - finalSH / 2, 0]);
          parts.push(label, sub);
        } else {
          label.moveTo([o.at[0], o.at[1], 0]);
          parts.push(label);
        }
        return { spec: o, mob: new Group(...parts), rect, color, fill };
      }
      case 'tangent': {
        const g = this.recs.get(o.graph);
        if (!g?.fn) return null;
        const line = new Line({ start: [0, 0, 0], end: [1, 0, 0], color, strokeWidth: 8 });
        const dot = new Dot({ point: [0, 0, 0], radius: 0.19, color: this.col('amber'), fillOpacity: 1, strokeWidth: 0 });
        const rec: Rec = { spec: o, mob: new Group(line, ...(o.dot !== false ? [dot] : [])), line, dot, color };
        this.placeTangent(rec, o.x);
        return rec;
      }
      case 'area': {
        const g = this.recs.get(o.graph);
        const ax = this.recs.get((g?.spec as { axes: string } | undefined)?.axes ?? '')?.mob as Axes | undefined;
        if (!g?.mob || !ax) return null;
        const a = ax.getArea(g.mob as FunctionGraph, o.range, { color, opacity: 0.4 });
        return { spec: o, mob: a, color };
      }
      case 'riemann': {
        const g = this.recs.get(o.graph);
        const ax = this.recs.get((g?.spec as { axes: string } | undefined)?.axes ?? '')?.mob as Axes | undefined;
        if (!g?.mob || !ax) return null;
        const r = ax.getRiemannRectangles(g.mob as FunctionGraph, { xRange: o.range, dx: (o.range[1] - o.range[0]) / o.n, color, fillOpacity: 0.32, strokeColor: this.col('muted'), strokeWidth: 1.5 });
        return { spec: o, mob: r, color };
      }
      case 'grid': {
        const cell = 0.6;
        const lines: Mobject[] = [];
        const n = o.extent;
        const half = n * cell;
        for (let i = -n; i <= n; i++) {
          const axisLine = i === 0;
          const stroke = axisLine ? this.col('off-white') : color;
          const sw = axisLine ? 3 : 1.5;
          lines.push(new Line({ start: [o.at[0] + i * cell, o.at[1] - half, 0], end: [o.at[0] + i * cell, o.at[1] + half, 0], color: stroke, strokeWidth: sw }));
          lines.push(new Line({ start: [o.at[0] - half, o.at[1] + i * cell, 0], end: [o.at[0] + half, o.at[1] + i * cell, 0], color: stroke, strokeWidth: sw }));
        }
        return { spec: o, mob: new VGroup(...lines), color };
      }
      case 'group':
        return { spec: o, mob: null, children: o.children, color };
      default:
        return null;
    }
  }

  private placeTangent(rec: Rec, x: number) {
    const spec = rec.spec as Extract<StageObject, { type: 'tangent' }>;
    const g = this.recs.get(spec.graph);
    const ax = this.recs.get((g?.spec as { axes: string } | undefined)?.axes ?? '')?.mob as Axes | undefined;
    if (!g?.fn || !ax || !rec.line) return;
    const f = g.fn;
    const y = f(x);
    if (!Number.isFinite(y)) return;
    const h = 1e-3;
    const slope = (f(x + h) - f(x - h)) / (2 * h);
    const p0 = ax.c2p(x, y);
    const p1 = ax.c2p(x + 0.05, y + slope * 0.05);
    let dx = p1[0] - p0[0];
    let dy = p1[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    const half = (spec.length ?? 3.4) / 2;
    dx = (dx / len) * half;
    dy = (dy / len) * half;
    rec.line.setStart([p0[0] - dx, p0[1] - dy, 0]);
    rec.line.setEnd([p0[0] + dx, p0[1] + dy, 0]);
    rec.dot?.moveTo([p0[0], p0[1], 0]);
  }

  // ── timeline ────────────────────────────────────────────────────

  private expand(ids: string[], seen = new Set<string>()): Rec[] {
    const out: Rec[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const r = this.recs.get(id);
      if (!r) continue;
      if (r.children) out.push(...this.expand(r.children, seen));
      else if (r.mob) out.push(r);
    }
    return out;
  }

  private show(m: Mobject) {
    if (this.shown.has(m)) return;
    this.shown.add(m);
    this.scene.add(m);
  }

  private makeDrivers(run: Run): Driver[] {
    const e = run.entry;
    const dur = Math.max(0.05, run.end - run.start);
    const lin = !!e.linear;
    const targets = this.expand(e.target);
    const out: Driver[] = [];
    const th = this.theme;
    for (const r of targets) {
      const m = r.mob!;
      const type = r.spec.type;
      switch (e.do) {
        case 'write':
          this.show(m);
          out.push(wrap(type === 'text' || type === 'mathtex' ? new Write(m, { duration: dur }) : new Create(m, { duration: dur }), lin));
          break;
        case 'create':
        case 'draw-graph':
          this.show(m);
          out.push(wrap(type === 'text' || type === 'mathtex' ? new Write(m, { duration: dur }) : type === 'box' || type === 'group' ? new FadeIn(m, { duration: dur }) : new Create(m, { duration: dur }), lin));
          break;
        case 'fade-in':
          this.show(m);
          out.push(wrap(new FadeIn(m, { duration: dur, shift: type === 'box' || type === 'text' || type === 'mathtex' ? [0, -0.22, 0] : [0, 0, 0] }), lin));
          break;
        case 'fade-out': {
          const a = new FadeOut(m, { duration: dur });
          out.push({ ...wrap(a, lin), remove: [m] });
          break;
        }
        case 'grow-arrow':
          this.show(m);
          out.push(wrap(new GrowArrow(m as Arrow, { duration: dur }), lin));
          break;
        case 'indicate':
          this.show(m);
          {
            // A scale pulse. (manim's Indicate recolors the whole group on finish, which flattens box fills.)
            let prev = 1;
            out.push({
              begin: () => {
                prev = 1;
              },
              at: (al) => {
                const f = 1 + 0.12 * Math.sin(Math.PI * al);
                m.scale(f / prev);
                prev = f;
              },
              end: () => undefined,
            });
          }
          break;
        case 'transform': {
          const to = this.recs.get(e.to!);
          if (!to?.mob) break;
          this.show(m);
          if (type === 'mathtex' || to.spec.type === 'mathtex') {
            // Cross-fade with 250ms overlap:
            // A glyph-by-glyph morph creates thick distorted black blobs (artifacts) during LaTeX formula morphs.
            // Overlapping cross-fade completely avoids glyph distortion.
            this.show(to.mob);
            const aOut = new FadeOut(m, { duration: dur });
            const aIn = new FadeIn(to.mob, { duration: dur, shift: [0, -0.16, 0] });
            const overlapFrac = Math.min(0.35, 0.25 / Math.max(0.5, dur));
            const outEnd = clamp01(0.5 + overlapFrac);
            const inStart = clamp01(0.5 - overlapFrac);
            out.push({
              begin: () => {
                aOut.begin();
                aIn.begin();
              },
              at: (al) => {
                const k = lin ? al : smooth(al);
                const alOut = clamp01(k / outEnd);
                const alIn = clamp01((k - inStart) / (1 - inStart));
                aOut.interpolate(alOut);
                aIn.interpolate(alIn);
              },
              end: () => {
                aOut.finish();
                aIn.finish();
              },
              remove: [m],
            });
            break;
          }
          out.push(wrap(new Transform(m, to.mob, { duration: dur }), lin));
          break;
        }
        case 'move-to': {
          this.show(m);
          const from = m.getCenter();
          const to = e.point!;
          out.push({
            begin: () => undefined,
            at: (al) => {
              const k = lin ? al : smooth(al);
              const c = m.getCenter();
              m.shift([from[0] + (to[0] - from[0]) * k - c[0], from[1] + (to[1] - from[1]) * k - c[1], 0]);
            },
            end: () => undefined,
          });
          break;
        }
        case 'move-along': {
          if (r.spec.type !== 'dot' || !r.spec.onGraph) break;
          const gid = r.spec.onGraph.graph;
          const g = this.recs.get(gid);
          const axId = (g?.spec as { axes: string } | undefined)?.axes;
          const ax = axId ? (this.recs.get(axId)?.mob as Axes | undefined) : undefined;
          if (!g?.fn || !ax) break;
          this.show(m);
          const f = g.fn;
          out.push({
            begin: () => undefined,
            at: (al) => {
              const k = lin ? al : smooth(al);
              const x = e.fromX! + (e.toX! - e.fromX!) * k;
              const y = f(x);
              if (Number.isFinite(y)) {
                const q = ax.c2p(x, y);
                const c = m.getCenter();
                m.shift([q[0] - c[0], q[1] - c[1], 0]);
              }
            },
            end: () => undefined,
          });
          break;
        }
        case 'trace-tangent': {
          if (type !== 'tangent') break;
          this.show(m);
          out.push({
            begin: () => undefined,
            at: (al) => this.placeTangent(r, e.fromX! + (e.toX! - e.fromX!) * (lin ? al : smooth(al))),
            end: () => undefined,
          });
          break;
        }
        case 'orbit': {
          if (type !== 'dot') break;
          this.show(m);
          const [cx, cy] = e.center!;
          out.push({
            begin: () => undefined,
            at: (al) => {
              const k = lin ? al : smooth(al);
              const a = ((e.fromDeg! + (e.toDeg! - e.fromDeg!) * k) * Math.PI) / 180;
              const c = m.getCenter();
              m.shift([cx + Math.cos(a) * e.radius! - c[0], cy + Math.sin(a) * e.radius! - c[1], 0]);
            },
            end: () => undefined,
          });
          break;
        }
        case 'highlight': {
          this.show(m);
          const target = this.col(e.color ?? 'amber');
          const base = r.color;
          out.push({
            begin: () => undefined,
            at: (al) => {
              const c = mix(target, base, smooth(al));
              if (r.rect) {
                r.rect.setColor(c);
                r.rect.setFill(mix(target, r.fill ?? th.panel, smooth(al) * 0.28), 1);
              } else m.setColor(c);
            },
            end: () => {
              r.color = target;
            },
          });
          break;
        }
        case 'apply-matrix': {
          this.show(m);
          const [a, b, c, d] = e.matrix!;
          const ctr: Pt = e.center ?? [0, 0];
          out.push(wrap(new ApplyMatrix(m, { matrix: [[a, c, 0], [b, d, 0], [0, 0, 1]], aboutPoint: v3(ctr), duration: dur }), lin));
          break;
        }
      }
    }
    return out;
  }

  /** Link lines and vectors to the dots they are anchored to. */
  private syncLinks() {
    for (const r of this.recs.values()) {
      const s = r.spec;
      if ((s.type !== 'line' && s.type !== 'vector') || (typeof s.from !== 'string' && typeof s.to !== 'string')) continue;
      if (!r.mob || !this.shown.has(r.mob)) continue;
      const a = this.ptOf(undefined, s.from, s.axes);
      const b = this.ptOf(undefined, s.to, s.axes);
      (r.mob as Line).setStart(a);
      (r.mob as Line).setEnd(b);
    }
  }

  private advance(t: number) {
    if (this.disposed) return;
    for (const run of this.runs) {
      if (t < run.start) break;
      if (run.state === 'done') continue;
      if (run.state === 'idle') {
        run.drivers = this.makeDrivers(run);
        run.drivers.forEach((d) => d.begin());
        run.state = 'running';
      }
      const span = Math.max(1e-6, run.end - run.start);
      const alpha = clamp01((t - run.start) / span);
      run.drivers.forEach((d) => d.at(alpha));
      if (alpha >= 1) {
        run.drivers.forEach((d) => {
          d.end();
          d.remove?.forEach((m) => {
            this.scene.remove(m);
            this.shown.delete(m);
          });
        });
        run.state = 'done';
      }
    }
    this.lastT = t;
    this.syncLinks();
    this.scene.render();
  }

  /** Show the scene at time t (runtime seconds). Cheap when moving forward. */
  seek(t: number) {
    if (this.disposed) return;
    this.wantT = t;
    if (!this.stage) return;
    if (this.loading) return; // load() applies wantT when the build is done
    if (t + 1e-6 < this.lastT) {
      // Backward: rebuild, then catch up to the latest requested time.
      void this.rebuild().then(() => {
        if (!this.disposed) this.advance(this.wantT);
      });
      return;
    }
    this.advance(t);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    try {
      const canvas = this.scene.getCanvas();
      this.scene.dispose();
      // Release the GPU context now instead of waiting for garbage collection (browsers cap live contexts).
      const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // already gone
    }
    this.recs.clear();
    this.container.querySelectorAll('canvas').forEach((c) => c.remove());
  }
}
