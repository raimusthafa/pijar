'use client';

// The board card: instruction, JSXGraph canvas, live readout, and native controls that mirror everything draggable.
// Only loaded in the browser (see InteractiveBoard.tsx). JSXGraph's own CSS is imported by path because the package
// does not export its stylesheet.
import '../../../../node_modules/jsxgraph/distrib/jsxgraph.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useT } from '@/lib/i18n/client';
import type { BoardSpec } from '@/lib/learn/board-spec';
import { buildBoard, readTokens, type BoardLive, type BuiltBoard } from './build-board';

const range = 'h-11 w-full cursor-pointer accent-(--pj-ink)';
const SWATCH = ['bg-foreground', 'bg-amber', 'bg-muted-foreground'];

export default function InteractiveBoardImpl({ spec }: { spec: BoardSpec }) {
  const { t, locale } = useT();
  const hostRef = useRef<HTMLDivElement>(null);
  const builtRef = useRef<BuiltBoard | null>(null);
  const paramsRef = useRef<Record<string, number>>({});
  const initial = useMemo(() => Object.fromEntries(spec.sliders.map((s) => [s.name, s.initial])) as Record<string, number>, [spec]);
  const [values, setValues] = useState(initial);
  const [live, setLive] = useState<BoardLive | null>(null);
  const [announce, setAnnounce] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const format = useCallback((v: number) => v.toLocaleString(locale === 'en' ? 'en-US' : 'id-ID', { maximumFractionDigits: 2 }), [locale]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const params = { ...initial };
    paramsRef.current = params;
    const built = buildBoard(host, spec, params, readTokens(host), format);
    builtRef.current = built;
    let frame: ReturnType<typeof setTimeout> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(frame);
      frame = setTimeout(() => {
        const next = built.compute();
        setLive(next);
        // Screen readers hear the values once the learner stops moving, not on every drag frame.
        clearTimeout(timer);
        timer = setTimeout(() => setAnnounce(spec.readouts.map((r, i) => `${r.label}: ${next.readouts[i]}`).join('. ')), 500);
      }, 16); // a timer, not rAF: it still runs in a background tab
    };
    built.onUpdate(schedule);
    schedule();
    return () => {
      clearTimeout(frame);
      clearTimeout(timer);
      builtRef.current = null;
      built.dispose();
    };
  }, [spec, initial, format, resetKey]);

  const setParam = (name: string, v: number) => {
    paramsRef.current[name] = v;
    setValues((p) => ({ ...p, [name]: v }));
    builtRef.current?.refresh();
  };
  const moveGlider = (id: string, x: number) => builtRef.current?.moveGlider(id, x);
  const movePointAxis = (id: string, fallback: [number, number], axis: number, v: number) => {
    const now = live?.pointXY[id] ?? fallback;
    builtRef.current?.movePoint(id, axis === 0 ? v : now[0], axis === 1 ? v : now[1]);
  };
  const reset = () => {
    setValues(initial);
    setResetKey((k) => k + 1);
  };

  const hasKeyboardControls = spec.gliders.length > 0 || spec.points.some((p) => p.draggable);
  const vx = spec.viewBox.x;

  return (
    <Card tone="raised" className="gap-4">
      <div className="grid gap-1 px-(--card-spacing)">
        {spec.instruction && <p className="text-base font-medium">{spec.instruction}</p>}
        {spec.learningGoal && <p className="text-sm text-muted-foreground">{t('learn.board.goal', { goal: spec.learningGoal })}</p>}
      </div>

      <div className="px-(--card-spacing)">
        <div className="overflow-hidden rounded-inner border border-hairline bg-ground">
          <div
            ref={hostRef}
            role="img"
            aria-label={t('learn.board.aria', { instruction: spec.instruction || spec.learningGoal })}
            className="h-72 w-full md:h-96"
            style={{ border: 0, borderRadius: 0, background: 'transparent' }}
          />
        </div>
      </div>

      {spec.curves.some((c) => c.label) && (
        <ul aria-label={t('learn.board.legend')} className="flex flex-wrap gap-x-5 gap-y-1 px-(--card-spacing) text-xs text-muted-foreground">
          {spec.curves.map((c, i) => c.label && (
            <li key={c.id} className="flex items-center gap-2">
              <span aria-hidden className={`h-0.5 w-5 ${c.dashed ? 'bg-muted-foreground opacity-60' : SWATCH[i % 3]}`} />
              {c.label}
            </li>
          ))}
        </ul>
      )}

      {spec.readouts.length > 0 && (
        <div className="px-(--card-spacing)">
          <dl aria-hidden className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-inner bg-surface p-4 sm:grid-cols-3">
            {spec.readouts.map((r, i) => (
              <div key={i}>
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
                <dd className="font-display text-h4 font-semibold tabular-nums">{live?.readouts[i] ?? '-'}</dd>
              </div>
            ))}
          </dl>
          <p role="status" aria-live="polite" aria-atomic className="sr-only">{announce}</p>
        </div>
      )}

      {spec.sliders.length > 0 && (
        <div className="grid gap-2 px-(--card-spacing) sm:grid-cols-2">
          {spec.sliders.map((s) => {
            const label = s.label ?? s.name;
            return (
              <div key={s.name} className="grid">
                <div className="flex items-baseline justify-between text-sm">
                  <label htmlFor={`bd-${s.name}`} className="font-medium">{label}</label>
                  <output htmlFor={`bd-${s.name}`} className="text-muted-foreground tabular-nums">{format(values[s.name])}</output>
                </div>
                <input
                  id={`bd-${s.name}`}
                  type="range"
                  className={range}
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={values[s.name]}
                  aria-label={label}
                  aria-valuetext={format(values[s.name])}
                  onChange={(e) => setParam(s.name, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      )}

      {hasKeyboardControls && (
        <details className="px-(--card-spacing)">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">{t('learn.board.keyboard')}</summary>
          <div className="grid gap-2 sm:grid-cols-2">
            {spec.gliders.map((g) => (
              <input
                key={g.id}
                type="range"
                className={range}
                min={vx[0]}
                max={vx[1]}
                step={(vx[1] - vx[0]) / 200}
                value={live?.gliderX[g.id] ?? g.x}
                aria-label={t('learn.board.glider', { id: g.id })}
                aria-valuetext={format(live?.gliderX[g.id] ?? g.x)}
                onChange={(e) => moveGlider(g.id, Number(e.target.value))}
              />
            ))}
            {spec.points.filter((p) => p.draggable).map((p) => (
              <PointRanges key={p.id} p={p} live={live} spec={spec} format={format} label={(axis) => t(axis === 0 ? 'learn.board.pointX' : 'learn.board.pointY', { id: p.label ?? p.id })} onMove={movePointAxis} />
            ))}
          </div>
        </details>
      )}

      <div className="flex justify-end px-(--card-spacing)">
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw strokeWidth={1.75} className="size-4" aria-hidden />
          {t('learn.board.reset')}
        </Button>
      </div>
    </Card>
  );
}

/** The x and y keyboard sliders of one draggable point. */
function PointRanges({ p, live, spec, format, label, onMove }: {
  p: BoardSpec['points'][number];
  live: BoardLive | null;
  spec: BoardSpec;
  format: (v: number) => string;
  label: (axis: number) => string;
  onMove: (id: string, fallback: [number, number], axis: number, v: number) => void;
}) {
  return (
    <>
      {[0, 1].map((axis) => {
        const cur = live?.pointXY[p.id]?.[axis] ?? p.at[axis];
        const [lo, hi] = axis === 0 ? spec.viewBox.x : spec.viewBox.y;
        return (
          <input
            key={axis}
            type="range"
            className={range}
            min={lo}
            max={hi}
            step={0.1}
            value={cur}
            aria-label={label(axis)}
            aria-valuetext={format(cur)}
            onChange={(e) => onMove(p.id, p.at, axis, Number(e.target.value))}
          />
        );
      })}
    </>
  );
}
