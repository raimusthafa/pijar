'use client';

import { useT } from '@/lib/i18n/client';
import { StatusChip } from './StatusChip';
import type { NodeStatus } from '@/types';

const ORDER: NodeStatus[] = ['prerequisite_gap', 'in_progress', 'ready', 'locked', 'completed'];

export function GraphLegend() {
  const { t } = useT();
  return (
    <section aria-label={t('graph.legend.title')} className="max-w-[min(34rem,calc(100vw-5rem))] rounded-inner border border-hairline bg-raised p-3">
      <ul className="flex flex-wrap gap-1.5">
        {ORDER.map((s) => (
          <li key={s}><StatusChip status={s} /></li>
        ))}
      </ul>
      <p className="mt-2 hidden text-xs text-muted-foreground sm:block">{t('graph.legend.hint')}</p>
    </section>
  );
}
