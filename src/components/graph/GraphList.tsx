'use client';

import Link from 'next/link';
import { ArrowRight, Network, Plus } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';

export type GraphCard = { id: string; topic: string; total: number; done: number; started: boolean; gaps: number; activeAt: string | null };

export function GraphListSkeleton() {
  return (
    <div aria-hidden>
      <div className="mx-auto w-full max-w-[var(--pj-content-max)] px-5 pt-8 pb-6 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="mx-auto flex w-full max-w-[var(--pj-content-max)] flex-col gap-3 px-5 md:px-8">
        {[0, 1, 2].map((k) => <Skeleton key={k} className="h-28 w-full rounded-card" />)}
      </div>
    </div>
  );
}

export function GraphList({ graphs, failed }: { graphs: GraphCard[]; failed: boolean }) {
  const { t, locale } = useT();
  const newMap = (
    <Button render={<Link href="/onboarding" />} nativeButton={false}>
      <Plus strokeWidth={1.75} aria-hidden />
      {t('graph.list.new')}
    </Button>
  );
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

  return (
    <>
      <PageHeader title={t('graph.title')} description={t('graph.list.desc')} actions={graphs.length > 0 ? newMap : undefined} />
      <PageBody>
        {failed && <p role="alert" className="rounded-inner bg-surface px-4 py-3 text-sm text-muted-foreground">{t('graph.list.error')}</p>}
        {graphs.length === 0 && !failed && (
          <EmptyState
            icon={Network}
            title={t('graph.list.empty.title')}
            description={t('graph.list.empty.desc')}
            action={<Button render={<Link href="/onboarding" />} nativeButton={false}>{t('graph.list.empty.action')}</Button>}
          />
        )}
        <ul className="flex flex-col gap-3">
          {graphs.map((g, i) => {
            const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
            const chip = g.gaps > 0
              ? <Badge variant="danger">{t('graph.list.status.gaps', { n: g.gaps })}</Badge>
              : g.total > 0 && g.done === g.total
                ? <Badge variant="success">{t('graph.list.status.done')}</Badge>
                : g.started
                  ? <Badge variant="warning">{t('graph.list.status.started')}</Badge>
                  : <Badge>{t('graph.list.status.new')}</Badge>;
            return (
              <li key={g.id} className="pj-rise" style={{ '--pj-i': i } as React.CSSProperties}>
                <Card tone="raised" className="flex-col gap-4 px-6 sm:flex-row sm:items-center sm:gap-8">
                  <div className="grid min-w-0 flex-1 gap-3">
                    <div className="grid justify-items-start gap-2">
                      <h2 className="line-clamp-2 max-w-full font-display text-h4 font-semibold break-words">{g.topic}</h2>
                      {chip}
                    </div>
                    <Progress value={pct} aria-label={g.topic} className="max-w-xl" />
                    <p className="text-sm text-muted-foreground">
                      <span className="tabular-nums">{t('graph.list.progress', { done: g.done, total: g.total })}</span>
                      {g.activeAt && <span> · {t('graph.list.active', { when: when(g.activeAt) })}</span>}
                    </p>
                  </div>
                  <Button render={<Link href={`/graph/${g.id}`} />} nativeButton={false} className="shrink-0 self-start sm:self-center">
                    {t('graph.list.open')}
                    <ArrowRight strokeWidth={1.75} aria-hidden />
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      </PageBody>
    </>
  );
}
