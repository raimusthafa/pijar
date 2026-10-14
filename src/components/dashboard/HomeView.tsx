'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Network, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/lib/i18n/client';
import { GraphCard } from '@/components/graph/GraphCard';
import { dueRows, nextStep, type NextKind } from '@/lib/dashboard/derive';
import { generateStudySchedule } from '@/lib/scheduler/engine';
import type { ReviewRow } from '@/lib/scheduler/engine';
import type { MessageKey } from '@/lib/i18n/messages';
import { LearningSchedulerView } from './LearningSchedulerView';
import type { DashboardGraph } from './types';
import { MathText } from '@/components/ui/math-text';

const REASON: Record<Exclude<NextKind, 'done'>, MessageKey> = {
  gap: 'dashboard.continue.gap',
  inProgress: 'dashboard.continue.inProgress',
  ready: 'dashboard.continue.ready',
  other: 'dashboard.continue.other',
};

export function HomeView({
  graphs,
  graph,
  rows,
  now,
}: {
  graphs: DashboardGraph[];
  graph?: DashboardGraph;
  rows: ReviewRow[];
  now: Date;
}) {
  const { t, locale } = useT();

  const dueNow = graph ? dueRows(rows, now).length : 0;
  const graphKey = graph?.id;
  useEffect(() => {
    if (!graphKey || dueNow === 0) return;
    const key = `pj-review-warm:${graphKey}:${locale}:${new Date().toDateString()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { return; }
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500));
    idle(() => { fetch(`/api/review/today?${new URLSearchParams({ graphId: graphKey, language: locale })}`).catch(() => {}); });
  }, [graphKey, dueNow, locale]);

  if (!graph) {
    return (
      <Card className="mt-4">
        <EmptyState
          icon={Network}
          title={t('dashboard.graphs.empty.title')}
          description={t('dashboard.graphs.empty.desc')}
          action={<Button render={<Link href="/onboarding" />} nativeButton={false}>{t('dashboard.graphs.empty.cta')}</Button>}
        />
      </Card>
    );
  }

  const next = nextStep(graph.nodes, graph.edges);
  const due = dueRows(rows, now).length;
  const upcoming = generateStudySchedule(graph.nodes, graph.edges, 45).items.filter(i => i.dayOffset > 0 && i.priority !== 'review');

  return (
    <div className="mt-4 grid gap-4">
      {/* Primary action card - visually dominant */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card
          className="pj-rise relative overflow-hidden justify-between"
          style={{ '--pj-i': 0 } as React.CSSProperties}
        >
          {/* Amber accent bar at top */}
          <div className="h-1 w-full bg-amber" aria-hidden />
          <div className="grid gap-3 px-(--card-spacing)">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t('dashboard.continue.title')}
            </p>
            {next.node ? (
              <>
                <h2 className="font-display text-h3 font-semibold"><MathText text={next.node.label} /></h2>
                <p className="max-w-prose text-sm text-muted-foreground">{t(REASON[next.kind as Exclude<NextKind, 'done'>])}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.continue.from', { topic: graph.topic })}
                  {next.node.estimated_minutes ? ` · ${t('dashboard.continue.minutes', { n: next.node.estimated_minutes })}` : ''}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-h3 font-semibold">{t('dashboard.continue.done.title')}</h2>
                <p className="max-w-prose text-sm text-muted-foreground">{t('dashboard.continue.done.desc')}</p>
              </>
            )}
          </div>
          <div className="px-(--card-spacing)">
            {next.node ? (
              <Button render={<Link href={`/learn/${graph.id}/${next.node.id}?topic=${encodeURIComponent(graph.topic)}`} />} nativeButton={false}>
                {next.kind === 'inProgress' ? t('dashboard.continue.ctaResume') : t('dashboard.continue.cta')}
                <ArrowRight strokeWidth={1.75} aria-hidden />
              </Button>
            ) : (
              <Button render={<Link href="/onboarding" />} nativeButton={false}>{t('dashboard.continue.done.cta')}</Button>
            )}
          </div>
        </Card>

        {/* Review card - secondary */}
        <Card
          className="pj-rise justify-between"
          style={{ '--pj-i': 1 } as React.CSSProperties}
        >
          <div className="grid gap-3 px-(--card-spacing)">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {t('dashboard.review.title')}
                </p>
              </div>
              {due === 0 && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Optimal
                </Badge>
              )}
            </div>
            {due > 0 ? (
              <p className="font-display text-h4 font-semibold text-foreground">
                {due === 1 ? t('dashboard.review.due.one') : t('dashboard.review.due', { n: due })}
              </p>
            ) : (
              <div className="space-y-1">
                <p className="font-display text-h4 font-semibold text-foreground">{t('dashboard.review.none')}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('dashboard.review.noneHint')}</p>
              </div>
            )}
          </div>
          <div className="px-(--card-spacing) pt-2">
            {due > 0 ? (
              <Button variant="secondary" render={<Link href={`/review?graphId=${graph.id}`} />} nativeButton={false}>
                <CalendarCheck strokeWidth={1.75} aria-hidden />
                {t('dashboard.review.cta')}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" render={<Link href={`/review?graphId=${graph.id}`} />} nativeButton={false} className="text-muted-foreground hover:text-foreground">
                {t('dashboard.review.cta')}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LearningSchedulerView graph={graph} />
        <Card className="pj-rise" style={{ '--pj-i': 3 } as React.CSSProperties}>
          <div className="grid gap-3 px-(--card-spacing)">
            <h2 className="font-display text-h4 font-semibold text-foreground">{t('dashboard.queue.title')}</h2>
            {upcoming.length === 0 ? (
              <div className="py-2 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{t('dashboard.queue.empty')}</p>
                <div>
                  <Button variant="secondary" size="sm" render={<Link href={`/graph/${graph.id}`} />} nativeButton={false}>
                    <Network className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {t('dashboard.graphs.open')}
                  </Button>
                </div>
              </div>
            ) : (
              <ol className="grid gap-1">
                {upcoming.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      href={`/learn/${graph.id}/${item.nodeId}?topic=${encodeURIComponent(graph.topic)}`}
                      className="flex min-h-11 items-center gap-3 rounded-inner px-2 py-1 text-sm transition-colors hover:bg-hover"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-pill bg-surface-strong text-xs font-semibold tabular-nums text-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">{item.conceptLabel}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.priority === 'high' ? t('dashboard.queue.kind.gap') : t('dashboard.queue.kind.next')}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-pill bg-surface-strong px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                        {t('dashboard.queue.minutes', { n: item.estimatedMinutes })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>

      <section aria-labelledby="graphs-h" className="grid gap-3 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id="graphs-h" className="font-display text-h4 font-semibold text-foreground">{t('dashboard.graphs.title')}</h2>
          <Button variant="ghost" size="sm" render={<Link href="/onboarding" />} nativeButton={false}>
            <Plus strokeWidth={1.75} aria-hidden />
            {t('dashboard.graphs.new')}
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {graphs.map((g, i) => {
            const done = g.nodes.filter(n => n.status === 'completed').length;
            const total = g.nodes.length;
            const gaps = g.nodes.filter(n => n.status === 'prerequisite_gap').length;
            const started = g.nodes.some(n => n.status === 'in_progress' || n.status === 'completed');
            return (
              <GraphCard
                key={g.id}
                index={i}
                graph={{
                  id: g.id,
                  topic: g.topic,
                  done,
                  total,
                  gaps,
                  started,
                  activeAt: null,
                }}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}
