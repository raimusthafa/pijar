'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/client';
import { computeMasteryMetrics } from '@/lib/mastery/engine';
import type { DashboardGraph } from './types';
import { MathText } from '@/components/ui/math-text';
import type { MessageKey } from '@/lib/i18n/messages';

type Fact = {
  labelKey: MessageKey;
  value: number;
  variant: 'success' | 'neutral' | 'danger' | 'outline';
};

export function MasteryTrackingView({ graph }: { graph?: DashboardGraph }) {
  const { t } = useT();
  const m = useMemo(() => (graph ? computeMasteryMetrics(graph.nodes, graph.edges) : null), [graph]);

  if (!graph || !m || m.totalConcepts === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">{t('dashboard.mastery.empty')}</p>;
  }

  const facts: Fact[] = [
    { labelKey: 'dashboard.mastery.mastered', value: m.completedConcepts, variant: 'success' },
    { labelKey: 'dashboard.mastery.ready', value: m.readyConcepts, variant: 'outline' },
    { labelKey: 'dashboard.mastery.gap', value: m.gapConcepts, variant: 'danger' },
    { labelKey: 'dashboard.mastery.locked', value: m.lockedConcepts, variant: 'neutral' },
  ];

  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="pj-rise">
        <div className="grid gap-6 px-(--card-spacing)">
          <div>
            <h2 className="font-display text-h4 font-semibold">{t('dashboard.mastery.title')}</h2>
            <p className="text-sm text-muted-foreground">{graph.topic}</p>
          </div>

          {/* Big percentage with progress bar */}
          <div className="grid gap-3">
            <div className="flex items-baseline gap-3">
              <p className="font-display text-h1 font-semibold tabular-nums leading-none">{m.completionPercentage}%</p>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.mastery.of', { done: m.completedConcepts, total: m.totalConcepts })}
              </p>
            </div>
            <Progress value={m.completionPercentage} aria-label={t('dashboard.mastery.title')} />
          </div>

          {/* Stats row with badges for visual weight */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map(f => (
              <div key={f.labelKey} className="grid gap-1.5">
                <dt className="text-xs text-muted-foreground">{t(f.labelKey)}</dt>
                <dd className="flex items-center gap-1.5">
                  <Badge variant={f.variant === 'outline' ? 'neutral' : f.variant} className="tabular-nums">
                    {f.value}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="grid content-start gap-4">
        <Card size="sm" tone="raised" className="pj-rise" style={{ '--pj-i': 1 } as React.CSSProperties}>
          <div className="grid gap-3 px-(--card-spacing)">
            <h3 className="text-sm font-medium">{t('dashboard.mastery.categories')}</h3>
            <ul className="grid gap-3">
              {m.categoryBreakdown.map(c => (
                <li key={c.category} className="grid gap-1.5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{c.category}</span>
                    <span className="text-muted-foreground tabular-nums">{c.completed}/{c.total}</span>
                  </div>
                  <Progress value={c.percentage} aria-label={c.category} />
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {m.bottlenecks.length > 0 && (
          <Card size="sm" tone="raised" className="pj-rise" style={{ '--pj-i': 2 } as React.CSSProperties}>
            <div className="grid gap-3 px-(--card-spacing)">
              <h3 className="text-sm font-medium">{t('dashboard.mastery.bottlenecks')}</h3>
              <ul className="grid gap-3">
                {m.bottlenecks.map(b => (
                  <li key={b.nodeId} className="text-sm">
                    <p className="font-medium"><MathText text={b.label} /></p>
                    <p className="text-muted-foreground">
                      {b.blockedDownstreamCount === 1
                        ? t('dashboard.mastery.unlocks.one')
                        : t('dashboard.mastery.unlocks', { n: b.blockedDownstreamCount })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
