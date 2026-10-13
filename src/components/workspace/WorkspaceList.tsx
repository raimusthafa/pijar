'use client';

import Link from 'next/link';
import { ArrowRight, Network, PencilRuler } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import type { Phase } from '@/lib/workspace/five-e';

export type ReadyRow = { graphId: string; nodeId: string; label: string; topic: string; minutes: number; inProgress: boolean };
export type RecentRow = { graphId: string; nodeId: string; label: string; topic: string; phase: Phase };

const href = (r: { graphId: string; nodeId: string }) => `/workspace/${r.graphId}/${r.nodeId}`;

function Row({ i, to, title, sub, end, cta }: { i: number; to: string; title: string; sub: string; end: React.ReactNode; cta: string }) {
  return (
    <li className="pj-rise" style={{ '--pj-i': i } as React.CSSProperties}>
      <Link
        href={to}
        className="pj-press flex min-h-14 items-center gap-4 rounded-inner border border-hairline bg-raised px-4 py-3 transition-colors duration-150 hover:bg-surface"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        {end}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{cta}</span>
          <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
      </Link>
    </li>
  );
}

export function WorkspaceListSkeleton() {
  return (
    <div aria-hidden>
      <div className="mx-auto w-full max-w-[var(--pj-content-max)] px-5 pt-8 pb-6 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="mx-auto flex w-full max-w-[var(--pj-content-max)] flex-col gap-2 px-5 md:px-8">
        {[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-14 w-full rounded-inner" />)}
      </div>
    </div>
  );
}

export function WorkspaceList({ ready, recent, blocked }: { ready: ReadyRow[]; recent: RecentRow[]; blocked: boolean }) {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t('workspace.title')} description={t('workspace.list.desc')} />
      <PageBody className="flex flex-col gap-10">
        {blocked && ready.length > 0 && (
          <p role="status" className="rounded-inner bg-surface px-4 py-3 text-sm text-muted-foreground">
            {t('workspace.blocked.title')}. {t('workspace.blocked.desc')}
          </p>
        )}
        {recent.length > 0 && (
          <section aria-labelledby="ws-recent">
            <h2 id="ws-recent" className="mb-3 font-display text-h4 font-semibold">{t('workspace.list.recent')}</h2>
            <ul className="flex flex-col gap-2">
              {recent.map((r, i) => (
                <Row
                  key={`${r.graphId}-${r.nodeId}`} i={i} to={href(r)} title={r.label} sub={r.topic}
                  end={<Badge>{t(`workspace.phase.${r.phase}` as MessageKey)}</Badge>} cta={t('workspace.list.continue')}
                />
              ))}
            </ul>
          </section>
        )}

        {ready.length > 0 ? (
          <section aria-labelledby="ws-ready">
            <h2 id="ws-ready" className="mb-3 font-display text-h4 font-semibold">{t('workspace.list.ready')}</h2>
            <ul className="flex flex-col gap-2">
              {ready.map((r, i) => (
                <Row
                  key={`${r.graphId}-${r.nodeId}`} i={i} to={href(r)} title={r.label}
                  sub={[r.topic, r.minutes ? t('workspace.list.minutes', { n: r.minutes }) : ''].filter(Boolean).join(' · ')}
                  end={<Badge variant={r.inProgress ? 'accent' : 'outline'}>{t(r.inProgress ? 'workspace.list.inProgress' : 'workspace.list.ready.label')}</Badge>}
                  cta={t('workspace.list.open')}
                />
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            icon={blocked ? PencilRuler : Network}
            title={t(blocked ? 'workspace.blocked.title' : 'workspace.list.empty.title')}
            description={t(blocked ? 'workspace.blocked.desc' : 'workspace.list.empty.desc')}
            action={blocked ? undefined : <Button render={<Link href="/graph" />} nativeButton={false}>{t('workspace.list.empty.action')}</Button>}
          />
        )}
      </PageBody>
    </>
  );
}
