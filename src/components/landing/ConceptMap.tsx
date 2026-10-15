'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { StatusChip } from '@/components/graph/StatusChip';
import type { MessageKey } from '@/lib/i18n/messages';
import { useT } from '@/lib/i18n/client';
import type { NodeStatus } from '@/types';
import { cn } from '@/lib/utils';

/*
  Sample prerequisite map, drawn like the app's map: cards with a status border, curved edges with arrowheads.
  Levels run top to bottom so it fits the narrow feature card and a phone. Cards sit on a two-column grid
  (a card that spans both columns is as wide as one column, centered); edges are measured from the real
  card boxes, so they always meet the cards. Selecting a card highlights everything it depends on.
*/
type Node = { id: string; cat: 'aljabar' | 'kalkulus'; status: NodeStatus; needs: string[]; cell: string };
const NODES: Node[] = [
  { id: 'n1', cat: 'aljabar', status: 'completed', needs: [], cell: 'col-span-2 row-start-1 w-[calc(50%-0.75rem)] justify-self-center' },
  { id: 'n2', cat: 'aljabar', status: 'prerequisite_gap', needs: ['n1'], cell: 'col-start-1 row-start-2' },
  { id: 'n3', cat: 'aljabar', status: 'locked', needs: ['n1'], cell: 'col-start-2 row-start-2' },
  { id: 'n5', cat: 'kalkulus', status: 'locked', needs: ['n2', 'n3'], cell: 'col-span-2 row-start-3 w-[calc(50%-0.75rem)] justify-self-center' },
];
const EDGES = NODES.flatMap((n) => n.needs.map((from) => ({ from, to: n.id })));

const BORDER: Record<string, string> = {
  completed: 'border-success',
  prerequisite_gap: 'border-danger',
  locked: 'border-hairline-strong',
};

function prerequisites(id: string, acc = new Set<string>()): Set<string> {
  for (const p of NODES.find((n) => n.id === id)?.needs ?? []) {
    acc.add(p);
    prerequisites(p, acc);
  }
  return acc;
}

type Curve = { key: string; d: string; from: string; to: string };

/** Down, across at mid height, down again, with rounded corners. The last segment is straight so the arrowhead points down. */
function stepPath(x1: number, y1: number, x2: number, y2: number): string {
  if (Math.abs(x2 - x1) < 1) return `M${x1} ${y1} V${y2}`;
  const mid = y1 + (y2 - y1) / 2;
  const r = Math.min(10, Math.abs(x2 - x1) / 2, (y2 - y1) / 4);
  const sx = Math.sign(x2 - x1);
  return `M${x1} ${y1} V${mid - r} Q${x1} ${mid} ${x1 + sx * r} ${mid} H${x2 - sx * r} Q${x2} ${mid} ${x2} ${mid + r} V${y2}`;
}

export function ConceptMap() {
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [curves, setCurves] = useState<Curve[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const path = selected ? new Set([selected, ...prerequisites(selected)]) : null;

  useLayoutEffect(() => {
    const root = box.current;
    if (!root) return;
    const measure = () => {
      const o = root.getBoundingClientRect();
      setCurves(
        EDGES.flatMap(({ from, to }) => {
          const a = cards.current.get(from)?.getBoundingClientRect();
          const b = cards.current.get(to)?.getBoundingClientRect();
          if (!a || !b) return [];
          const x1 = a.left + a.width / 2 - o.left, y1 = a.bottom - o.top;
          const x2 = b.left + b.width / 2 - o.left, y2 = b.top - o.top;
          return [{ key: `${from}-${to}`, from, to, d: stepPath(x1, y1, x2, y2) }];
        }),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="h-full py-2">
      <div ref={box} role="group" aria-label={t('landing.fitur.map.label')} className="relative grid h-full grid-cols-2 content-between gap-x-6 gap-y-12">
        {curves.length > 0 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <defs>
              {(['ink', 'amber'] as const).map((c) => (
                <marker key={c} id={`pj-arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0 L10 5 L0 10 z" className={c === 'ink' ? 'fill-ink' : 'fill-amber'} />
                </marker>
              ))}
            </defs>
            {curves.map((c) => {
              const lit = !!path && path.has(c.from) && path.has(c.to);
              return (
                <path
                  key={c.key}
                  d={c.d}
                  fill="none"
                  strokeWidth={lit ? 2.5 : 1.75}
                  strokeLinecap="round" strokeLinejoin="round"
                  markerEnd={`url(#pj-arrow-${lit ? 'amber' : 'ink'})`}
                  className={cn('transition-[stroke,opacity] duration-200', lit ? 'stroke-amber' : 'stroke-ink', path && !lit && 'opacity-25')}
                />
              );
            })}
          </svg>
        )}
        {NODES.map((n) => {
          const inPath = path?.has(n.id) ?? false;
          return (
            <button
              key={n.id}
              ref={(el) => {
                if (el) cards.current.set(n.id, el);
                else cards.current.delete(n.id);
              }}
              type="button"
              aria-pressed={selected === n.id}
              onClick={() => setSelected(selected === n.id ? null : n.id)}
              className={cn(
                'pj-press relative z-10 flex flex-col items-start gap-2 rounded-inner border-2 bg-raised p-3.5 text-left transition-[opacity,border-color] duration-200 ease-out-pj',
                BORDER[n.status],
                selected === n.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : inPath ? 'ring-2 ring-amber' : '',
                path && !inPath ? 'opacity-25' : n.status === 'locked' ? 'opacity-75' : 'opacity-100',
                n.cell,
              )}
            >
              <span className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(`landing.node.cat.${n.cat}` as MessageKey)}</span>
                <StatusChip status={n.status} className="h-5 px-2 text-[11px]" />
              </span>
              <span className="text-[15px] leading-snug font-semibold text-foreground">{t(`landing.node.${n.id}` as MessageKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
