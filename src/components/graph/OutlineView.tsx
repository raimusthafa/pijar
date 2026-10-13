'use client';

import type { EnrichedConceptNode } from '@/lib/graph/types';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { StatusChip } from './StatusChip';

export type OutlineGroup = { level: number; nodes: EnrichedConceptNode[] };

/** The same concepts as the canvas, as a list grouped by learning level. Works with a thumb and with arrow keys. */
export function OutlineView({
  groups,
  selectedId,
  onSelect,
  prereqs,
  padBottom,
}: {
  groups: OutlineGroup[];
  selectedId: string | null;
  onSelect: (id: string, viaKeyboard: boolean) => void;
  prereqs: Map<string, string[]>;
  padBottom: boolean;
}) {
  const { t } = useT();
  const first = groups[0]?.nodes[0]?.id;
  const tabStop = selectedId ?? first;

  const move = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const all = Array.from(e.currentTarget.closest('[data-outline]')!.querySelectorAll<HTMLElement>('[data-row]'));
    const i = all.indexOf(e.currentTarget);
    const next = all[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div
      data-outline
      role="region"
      aria-label={t('graph.outline.label')}
      className={cn('h-full overflow-y-auto px-5 pt-4 md:px-8', padBottom ? 'pb-[80%] md:pb-8' : 'pb-8')}
    >
      <div className="mx-auto grid max-w-3xl gap-6">
        {groups.map((g) => (
          <section key={g.level} aria-labelledby={`lvl-${g.level}`}>
            <h2 id={`lvl-${g.level}`} className="mb-2 text-xs font-medium text-muted-foreground">
              {t('graph.outline.level', { n: g.level + 1 })}
            </h2>
            <ul className="grid gap-2">
              {g.nodes.map((n) => {
                const pre = prereqs.get(n.id)?.length ?? 0;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      data-row
                      id={`gnode-${n.id}`}
                      tabIndex={tabStop === n.id ? 0 : -1}
                      aria-pressed={selectedId === n.id}
                      onClick={(e) => onSelect(n.id, e.detail === 0)}
                      onKeyDown={move}
                      className={cn(
                        'pj-press flex min-h-14 w-full items-center gap-3 rounded-inner border bg-raised px-4 py-3 text-left transition-colors duration-150 hover:bg-surface',
                        selectedId === n.id ? 'border-foreground' : 'border-hairline',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {pre > 0 ? t('graph.outline.prereq', { n: pre }) : t('graph.outline.prereq.none')}
                          {n.estimated_minutes > 0 && ` · ${t('graph.node.minutes', { n: n.estimated_minutes })}`}
                        </span>
                      </span>
                      <StatusChip status={n.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
