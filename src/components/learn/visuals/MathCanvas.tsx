'use client';

// Mafs drawing for a validated MathSpec. Loaded lazily by MathVisual (Mafs needs the browser).
import React, { useMemo, useState } from 'react';
import { Mafs, Coordinates, Plot, Vector, Point, Text, Polygon, Line, MovablePoint } from 'mafs';
import 'mafs/core.css';
import type { MathSpec } from '@/lib/learn/types';
import { compileExpr } from '@/lib/learn/math-spec';

const INK = 'var(--pj-ink, var(--foreground, currentColor))';
const AMBER = 'var(--pj-amber, var(--primary, currentColor))';
const MUTED = 'var(--muted-foreground, currentColor)';
const CURVE_COLORS = [INK, AMBER, MUTED];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export interface MathCanvasProps {
  spec: MathSpec;
  /** 0..1 progress of the current scene; 1 = final frame. */
  progress: number;
  /** Allow dragging (player paused or scene finished). */
  interactive: boolean;
}

export default function MathCanvas({ spec, progress, interactive }: MathCanvasProps) {
  const vb = spec.viewBox ?? { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number] };
  const fns = useMemo(
    () =>
      (spec.functions ?? []).flatMap((f, i) => {
        const fn = compileExpr(f.expr);
        return fn ? [{ fn, label: f.label, color: CURVE_COLORS[i % CURVE_COLORS.length] }] : [];
      }),
    [spec.functions],
  );

  return (
    <Mafs
      width="auto"
      height={280}
      pan={false}
      zoom={false}
      preserveAspectRatio={spec.template === 'vector-add' || spec.template === 'ratio' ? 'contain' : false}
      viewBox={{ x: vb.x, y: vb.y, padding: 0 }}
    >
      <Coordinates.Cartesian />
      {spec.template === 'vector-add' && <VectorLayer spec={spec} progress={progress} interactive={interactive} />}
      {spec.template === 'ratio' && spec.ratio && <RatioLayer a={spec.ratio.a} b={spec.ratio.b} progress={progress} />}
      {spec.template !== 'vector-add' && spec.template !== 'ratio' && (
        <FunctionLayer spec={spec} fns={fns} xr={vb.x} progress={progress} interactive={interactive} />
      )}
      {spec.points?.map((p, i) => (
        <React.Fragment key={i}>
          <Point x={p.at[0]} y={p.at[1]} color={AMBER} opacity={ease(progress * 2)} />
          {p.label && (
            <Text x={p.at[0]} y={p.at[1]} attach="ne" size={14} color={INK}>
              {p.label}
            </Text>
          )}
        </React.Fragment>
      ))}
    </Mafs>
  );
}

type Fn = { fn: (x: number) => number; label?: string; color: string };

function FunctionLayer({
  spec,
  fns,
  xr,
  progress,
  interactive,
}: {
  spec: MathSpec;
  fns: Fn[];
  xr: [number, number];
  progress: number;
  interactive: boolean;
}) {
  const [dragX, setDragX] = useState<number | null>(null);
  const draw = ease(progress * 2); // curves finish drawing by mid-scene
  const slide = ease((progress - 0.3) / 0.7); // tangent point / shaded area follow
  const first = fns[0];

  // Tangent point: slides in from the left edge, then (when paused) can be dragged along the curve.
  const x0 = spec.tangentAt ?? 0;
  const tx = dragX ?? lerp(xr[0] + (xr[1] - xr[0]) * 0.05, x0, slide);
  const ty = first ? first.fn(tx) : NaN;
  let slope = NaN;
  if (spec.template === 'tangent' && first && Number.isFinite(ty)) {
    const h = 1e-4;
    slope = (first.fn(tx + h) - first.fn(tx - h)) / (2 * h);
  }

  const [a, b] = spec.shadeArea ?? [0, 0];
  const end = lerp(a, b, slide);
  const areaPts: [number, number][] = [];
  if (spec.template === 'area' && first && end > a) {
    areaPts.push([a, 0]);
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const x = lerp(a, end, i / n);
      const y = first.fn(x);
      if (Number.isFinite(y)) areaPts.push([x, y]);
    }
    areaPts.push([end, 0]);
  }

  return (
    <>
      {areaPts.length > 3 && (
        <Polygon points={areaPts} color={AMBER} fillOpacity={0.25} strokeOpacity={0} weight={0} />
      )}
      {fns.map((f, i) => (
        <React.Fragment key={i}>
          <Plot.OfX y={f.fn} domain={[xr[0], Math.max(xr[0] + 1e-6, lerp(xr[0], xr[1], draw))]} color={f.color} weight={3} />
          {f.label && draw > 0.95 && (
            <Text x={xr[1]} y={Number.isFinite(f.fn(xr[1])) ? f.fn(xr[1]) : 0} attach="sw" size={14} color={f.color}>
              {f.label}
            </Text>
          )}
        </React.Fragment>
      ))}
      {spec.template === 'tangent' && Number.isFinite(slope) && draw > 0.5 && (
        <>
          <Line.PointSlope point={[tx, ty]} slope={slope} color={AMBER} weight={2} />
          {interactive && first ? (
            <MovablePoint
              point={[tx, ty]}
              onMove={([x]) => setDragX(Math.min(xr[1], Math.max(xr[0], x)))}
              constrain={([x]) => {
                const cx = Math.min(xr[1], Math.max(xr[0], x));
                return [cx, first.fn(cx)];
              }}
              color={AMBER}
            />
          ) : (
            <Point x={tx} y={ty} color={AMBER} />
          )}
          <Text x={tx} y={ty} attach="se" size={13} color={INK}>
            {`m = ${slope.toFixed(2)}`}
          </Text>
        </>
      )}
    </>
  );
}

function VectorLayer({ spec, progress, interactive }: { spec: MathSpec; progress: number; interactive: boolean }) {
  const vecs = spec.vectors ?? [];
  const [drag, setDrag] = useState<[number, number] | null>(null);

  // Chain tail-to-head unless a vector names its own start.
  let cx = 0;
  let cy = 0;
  const placed = vecs.map((v, i) => {
    const from: [number, number] = v.from ?? [cx, cy];
    let to: [number, number] = v.to;
    if (i === vecs.length - 1 && drag) to = drag;
    cx = to[0];
    cy = to[1];
    return { from, to, label: v.label };
  });
  const resultant = placed.length >= 2 ? ([cx, cy] as [number, number]) : null;
  const last = placed[placed.length - 1];

  return (
    <>
      {placed.map((v, i) => {
        const g = ease(progress * 1.6 - i * 0.35); // vectors grow one after another
        const tip: [number, number] = [lerp(v.from[0], v.to[0], g), lerp(v.from[1], v.to[1], g)];
        return (
          <React.Fragment key={i}>
            {g > 0.01 && <Vector tail={v.from} tip={tip} color={i % 2 ? AMBER : INK} weight={3} />}
            {v.label && g > 0.9 && (
              <Text x={(v.from[0] + v.to[0]) / 2} y={(v.from[1] + v.to[1]) / 2} attach="nw" size={14} color={INK}>
                {v.label}
              </Text>
            )}
          </React.Fragment>
        );
      })}
      {resultant && ease((progress - 0.6) / 0.4) > 0.01 && (
        <Vector
          tip={[resultant[0] * ease((progress - 0.6) / 0.4), resultant[1] * ease((progress - 0.6) / 0.4)]}
          color={MUTED}
          style="dashed"
          weight={3}
        />
      )}
      {interactive && last && (
        <MovablePoint
          point={last.to}
          onMove={(p) => setDrag([Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2])}
          color={AMBER}
        />
      )}
    </>
  );
}

function RatioLayer({ a, b, progress }: { a: number; b: number; progress: number }) {
  const unit = 6 / Math.max(a, b);
  const g = ease(progress * 1.5);
  const bar = (y: number, len: number, color: string, text: string) => (
    <>
      <Polygon
        points={[
          [0, y],
          [len * g, y],
          [len * g, y + 1],
          [0, y + 1],
        ]}
        color={color}
        fillOpacity={0.35}
        weight={2}
      />
      {g > 0.9 && (
        <Text x={len} y={y + 0.5} attach="e" attachDistance={8} size={14} color={INK}>
          {text}
        </Text>
      )}
    </>
  );
  return (
    <>
      {bar(1, a * unit, INK, `${a}`)}
      {bar(3, b * unit, AMBER, `${b}`)}
    </>
  );
}
