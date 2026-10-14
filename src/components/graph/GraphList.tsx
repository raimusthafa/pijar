'use client';

import Link from 'next/link';
import { Network, Plus } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';
import { GraphCard, type GraphCardData } from './GraphCard';

export type GraphCard = GraphCardData;

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
  const { t } = useT();
  const newMap = (
    <Button render={<Link href="/onboarding" />} nativeButton={false}>
      <Plus strokeWidth={1.75} aria-hidden />
      {t('graph.list.new')}
    </Button>
  );

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
          {graphs.map((g, i) => (
            <GraphCard key={g.id} graph={g} index={i} />
          ))}
        </ul>
      </PageBody>
    </>
  );
}
