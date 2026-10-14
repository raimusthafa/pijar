'use client';

import Link from 'next/link';
import { forwardRef, useMemo } from 'react';
import { PencilRuler, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { prerequisitesWithin } from '@/lib/graph/prereq';
import type { EnrichedConceptNode } from '@/lib/graph/types';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import type { CurriculumEdge } from '@/types';
import { StatusChip } from './StatusChip';
import { MathText } from '@/components/ui/math-text';

type Props = {
  node: EnrichedConceptNode | null;
  open: boolean;
  nodes: Map<string, EnrichedConceptNode>;
  edges: CurriculumEdge[];
  graphId: string;
  topic: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

function PrereqList({ ids, nodes, edges, to, onSelect }: { ids: string[]; nodes: Map<string, EnrichedConceptNode>; edges: CurriculumEdge[]; to: string; onSelect: (id: string) => void }) {
  return (
    <ul className="grid gap-1">
      {ids.map((id) => {
        const n = nodes.get(id);
        if (!n) return null;
        const why = edges.find((e) => e.source === id && e.target === to)?.label;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className="pj-press flex min-h-11 w-full items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors duration-150 hover:bg-hover"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{n.label}</span>
                {why && <span className="block truncate text-xs text-muted-foreground">{why}</span>}
              </span>
              <StatusChip status={n.status} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Right panel on desktop, bottom sheet below md. Stays mounted so open and close are the same interruptible transition. */
export const GraphInspector = forwardRef<HTMLElement, Props>(function GraphInspector(
  { node, open, nodes, edges, graphId, topic, onClose, onSelect },
  ref,
) {
  const { t } = useT();
  const chain = useMemo(() => (node ? prerequisitesWithin(node.id, edges) : null), [node, edges]);
  const direct = chain ? [...chain.level].filter(([, l]) => l === 1).map(([id]) => id) : [];
  const deeper = chain ? [...chain.level].filter(([, l]) => l === 2).map(([id]) => id) : [];
  const unresolved = direct.find((id) => nodes.get(id)?.status !== 'completed');
  const redirectToPrereq = node?.status === 'locked' && unresolved;
  const learnId = redirectToPrereq ? unresolved : node?.id;

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      inert={!open}
      aria-hidden={!open}
      aria-label={t('graph.insp.label')}
      className={cn(
        'absolute z-20 flex flex-col overflow-hidden border border-hairline bg-raised outline-none',
        'inset-x-0 bottom-0 max-h-[78%] rounded-t-card border-b-0',
        'md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:max-h-none md:w-[360px] md:rounded-card md:border-b',
        'transition-[transform,opacity] duration-300 ease-drawer motion-reduce:transition-none',
        open ? 'translate-y-0 opacity-100 md:translate-x-0' : 'pointer-events-none translate-y-full opacity-0 md:translate-x-4 md:translate-y-0',
      )}
    >
      {node && (
        <>
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={node.status} />
                {node.estimated_minutes > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{t('graph.node.minutes', { n: node.estimated_minutes })}</span>
                )}
              </div>
              <h2 className="mt-3 font-display text-h4 font-semibold"><MathText text={node.label} /></h2>
              {node.category && <p className="mt-0.5 text-xs text-muted-foreground">{node.category}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={t('graph.insp.close')} onClick={onClose}>
              <X strokeWidth={1.75} aria-hidden />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {node.description && <p className="text-sm"><MathText text={node.description} /></p>}
            {node.justification && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-muted-foreground">{t('graph.insp.why')}</h3>
                <p className="mt-1 text-sm">{node.justification}</p>
              </div>
            )}

            <Separator className="my-4" />

            <h3 className="mb-1 text-xs font-medium text-muted-foreground">{t('graph.insp.prereq')}</h3>
            {direct.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('graph.insp.prereq.none')}</p>
            ) : (
              <PrereqList ids={direct} nodes={nodes} edges={edges} to={node.id} onSelect={onSelect} />
            )}
            {deeper.length > 0 && (
              <>
                <h3 className="mt-4 mb-1 text-xs font-medium text-muted-foreground">{t('graph.insp.prereq.deeper')}</h3>
                <PrereqList ids={deeper} nodes={nodes} edges={edges} to="" onSelect={onSelect} />
                <p className="mt-2 text-xs text-muted-foreground">{t('graph.insp.prereq.note')}</p>
              </>
            )}
          </div>

          <div className="grid gap-2 border-t border-hairline px-5 py-4">
            {redirectToPrereq && <p className="text-xs text-muted-foreground">{t('graph.insp.blocked')}</p>}
            <Button render={<Link href={`/learn/${graphId}/${learnId}`} />} nativeButton={false} size="lg" className="w-full">
              {t(redirectToPrereq ? 'graph.insp.learn.prereq' : 'graph.insp.learn')}
            </Button>
            <Button variant="secondary" render={<Link href={`/workspace/${graphId}/${node.id}`} />} nativeButton={false}>
              <PencilRuler strokeWidth={1.75} aria-hidden />
              {t('graph.insp.workspace')}
            </Button>
            <Button variant="ghost" render={<Link href={`/diagnostic?topic=${encodeURIComponent(topic)}`} />} nativeButton={false}>
              <RotateCcw strokeWidth={1.75} aria-hidden />
              {t('graph.insp.retake')}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
});
