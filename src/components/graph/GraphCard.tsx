'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useT } from '@/lib/i18n/client';

export type GraphCardData = {
  id: string;
  topic: string;
  done: number;
  total: number;
  gaps: number;
  started: boolean;
  activeAt?: string | null;
};

export interface GraphCardProps {
  graph: GraphCardData;
  index?: number;
}

export function GraphCard({ graph: g, index }: GraphCardProps) {
  const { t, locale } = useT();
  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

  const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
  const chip =
    g.gaps > 0 ? (
      <Badge variant="danger">{t('graph.list.status.gaps', { n: g.gaps })}</Badge>
    ) : g.total > 0 && g.done === g.total ? (
      <Badge variant="success">{t('graph.list.status.done')}</Badge>
    ) : g.started ? (
      <Badge variant="warning">{t('graph.list.status.started')}</Badge>
    ) : (
      <Badge>{t('graph.list.status.new')}</Badge>
    );

  return (
    <li className="pj-rise" style={{ '--pj-i': index } as React.CSSProperties}>
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
}
