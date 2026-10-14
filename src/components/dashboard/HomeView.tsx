'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Network, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { useT } from '@/lib/i18n/client';
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

  // Warm the question bank while the reader looks at the dashboard, so the review opens without the long wait.
  // The server caches what it writes, so this runs at most once per map and language each day.
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="pj-rise justify-between">
          <div className="grid gap-3 px-(--card-spacing)">
            <p className="text-sm text-muted-foreground">{t('dashboard.continue.title')}</p>
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

        <Card className="pj-rise justify-between" style={{ '--pj-i': 1 } as React.CSSProperties}>
          <div className="grid gap-2 px-(--card-spacing)">
            <p className="text-sm text-muted-foreground">{t('dashboard.review.title')}</p>
            {due > 0 ? (
              <p className="font-display text-h4 font-semibold">
                {due === 1 ? t('dashboard.review.due.one') : t('dashboard.review.due', { n: due })}
              </p>
            ) : (
              <>
                <p className="font-display text-h4 font-semibold">{t('dashboard.review.none')}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.review.noneHint')}</p>
              </>
            )}
          </div>
          {due > 0 && (
            <div className="px-(--card-spacing)">
              <Button variant="secondary" render={<Link href={`/review?graphId=${graph.id}`} />} nativeButton={false}>
                <CalendarCheck strokeWidth={1.75} aria-hidden />
                {t('dashboard.review.cta')}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LearningSchedulerView graph={graph} />
        <Card className="pj-rise" style={{ '--pj-i': 3 } as React.CSSProperties}>
          <div className="grid gap-3 px-(--card-spacing)">
            <h2 className="font-display text-h4 font-semibold">{t('dashboard.queue.title')}</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.queue.empty')}</p>
            ) : (
              <ol className="grid gap-1">
                {upcoming.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      href={`/learn/${graph.id}/${item.nodeId}?topic=${encodeURIComponent(graph.topic)}`}
                      className="flex min-h-11 items-center gap-3 rounded-inner px-2 text-sm transition-colors hover:bg-hover"
                    >
                      <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.conceptLabel}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.priority === 'high' ? t('dashboard.queue.kind.gap') : t('dashboard.queue.kind.next')}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
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
          <h2 id="graphs-h" className="font-display text-h4 font-semibold">{t('dashboard.graphs.title')}</h2>
          <Button variant="ghost" size="sm" render={<Link href="/onboarding" />} nativeButton={false}>
            <Plus strokeWidth={1.75} aria-hidden />
            {t('dashboard.graphs.new')}
          </Button>
        </div>
        <ul className="grid gap-2">
          {graphs.map(g => {
            const done = g.nodes.filter(n => n.status === 'completed').length;
            const total = g.nodes.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <li key={g.id}>
                <Card size="sm" tone="raised" className="flex-row items-center gap-4 px-4">
                  <div className="grid min-w-0 flex-1 gap-2">
                    <p className="truncate font-medium">{g.topic}</p>
                    <Progress value={pct} aria-label={g.topic} />
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.graphs.progress', { done, total })}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" render={<Link href={`/graph/${g.id}`} />} nativeButton={false}>
                    {t('dashboard.graphs.open')}
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
