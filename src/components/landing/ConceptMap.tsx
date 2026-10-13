'use client';

import { useState } from 'react';
import type { MessageKey } from '@/lib/i18n/messages';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { ConceptCard, type ConceptStatus } from './ConceptCard';

/*
  Sample prerequisite map on a 3 by 2 grid. Cells are joined by hairline connectors (no SVG math).
  Order: n1 -> n2 -> n3, then n3 down to n4, then n4 left to n5. Selecting a node highlights everything it depends on.
*/
type Node = { id: string; col: number; row: number; cat: 'aljabar' | 'kalkulus'; status: ConceptStatus; needs: string[]; link?: 'right' | 'down' | 'left' };
const NODES: Node[] = [
  { id: 'n1', col: 0, row: 0, cat: 'aljabar', status: 'completed', needs: [], link: 'right' },
  { id: 'n2', col: 1, row: 0, cat: 'aljabar', status: 'gap', needs: ['n1'], link: 'right' },
  { id: 'n3', col: 2, row: 0, cat: 'aljabar', status: 'locked', needs: ['n2'], link: 'down' },
  { id: 'n4', col: 2, row: 1, cat: 'kalkulus', status: 'locked', needs: ['n3'], link: 'left' },
  { id: 'n5', col: 1, row: 1, cat: 'kalkulus', status: 'locked', needs: ['n4'] },
];

function prerequisites(id: string, acc = new Set<string>()): Set<string> {
  for (const p of NODES.find((n) => n.id === id)?.needs ?? []) {
    acc.add(p);
    prerequisites(p, acc);
  }
  return acc;
}

// Desktop grid cells (static strings so Tailwind sees them). Below sm the cards stack in order.
const POS: Record<string, string> = {
  n1: 'sm:col-start-1 sm:row-start-1',
  n2: 'sm:col-start-2 sm:row-start-1',
  n3: 'sm:col-start-3 sm:row-start-1',
  n4: 'sm:col-start-3 sm:row-start-2',
  n5: 'sm:col-start-2 sm:row-start-2',
};

const LINK = {
  right: 'left-full top-1/2 h-0.5 w-9 -translate-y-1/2',
  left: 'right-full top-1/2 h-0.5 w-9 -translate-y-1/2',
  down: 'left-1/2 top-full h-9 w-0.5 -translate-x-1/2',
} as const;

export function ConceptMap() {
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const path = selected ? new Set([selected, ...prerequisites(selected)]) : null;

  return (
    <div className="py-2">
      <div role="group" aria-label={t('landing.fitur.map.label')} className="grid grid-cols-1 gap-y-9 sm:grid-cols-3 sm:gap-x-9">
        {NODES.map((n, i) => {
          const inPath = path?.has(n.id) ?? false;
          // The connector leaving n is lit when both n and the next node are in the selected path.
          const next = NODES[i + 1];
          const lit = !!path && inPath && !!next && path.has(next.id);
          const tone = lit ? 'bg-amber' : 'bg-hairline-strong';
          return (
            <div key={n.id} className={cn('relative h-full', POS[n.id])}>
              {next && <span aria-hidden="true" className={cn('absolute left-1/2 top-full h-9 w-0.5 -translate-x-1/2 transition-colors duration-200 sm:hidden', tone)} />}
              {n.link && <span aria-hidden="true" className={cn('absolute hidden transition-colors duration-200 sm:block', LINK[n.link], tone)} />}
              <button
                type="button"
                aria-pressed={selected === n.id}
                onClick={() => setSelected(selected === n.id ? null : n.id)}
                className={cn('pj-press block h-full w-full rounded-inner text-left transition-opacity duration-200', path && !inPath && 'opacity-45')}
              >
                <ConceptCard
                  category={t(`landing.node.cat.${n.cat}` as MessageKey)}
                  title={t(`landing.node.${n.id}` as MessageKey)}
                  status={n.status}
                  statusLabel={t(`landing.status.${n.status}` as MessageKey)}
                  className={cn('h-full transition-colors duration-200', inPath ? 'border-amber' : n.status === 'gap' && 'border-amber')}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
