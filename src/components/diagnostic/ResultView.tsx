'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useT } from '@/lib/i18n/client';
import type { ResultData } from './types';
import { MathText } from '@/components/ui/math-text';

/** Two columns: the answer (where to start, what to do) on the left, the evidence on the right. */
export function ResultView({ r, onRetake }: { r: ResultData; onRetake: () => void }) {
  const { t } = useT();
  const lead =
    r.gaps.length === 0 ? t('diagnostic.result.lead.none')
    : r.gaps.length === 1 ? t('diagnostic.result.lead.one')
    : t('diagnostic.result.lead.many', { n: r.gaps.length });

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
      <div className="pj-rise grid gap-6 lg:sticky lg:top-8">
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t('diagnostic.result.title')}</p>
          <h1 className="font-display text-h2 font-semibold">{r.startLabel ?? t('diagnostic.result.start.fallback')}</h1>
          <p className="max-w-prose text-muted-foreground">{lead}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {r.graphId && (
            <Button size="lg" render={<Link href={`/graph/${r.graphId}`} />} nativeButton={false}>
              {t('diagnostic.action.map')}
            </Button>
          )}
          <Button size="lg" variant="ghost" onClick={onRetake}>{t('diagnostic.action.retake')}</Button>
        </div>
      </div>

      <Card tone="raised" className="pj-rise gap-8" style={{ '--pj-i': 1 } as React.CSSProperties}>
        <dl className="grid gap-3 px-(--card-spacing) text-sm">
          <Row k={t('diagnostic.result.row.answered')} v={t('diagnostic.result.row.answered.value', { n: r.answered })} />
          <Row k={t('diagnostic.result.row.gaps')} v={t('diagnostic.result.row.concepts', { n: r.gaps.length })} />
          <Row k={t('diagnostic.result.row.mastered')} v={t('diagnostic.result.row.concepts', { n: r.mastered.length })} />
        </dl>

        <section className="grid gap-3 border-t border-hairline px-(--card-spacing) pt-6">
          <h2 className="font-display text-h4 font-semibold">{t('diagnostic.result.gaps.title')}</h2>
          {r.gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('diagnostic.result.gaps.empty')}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {r.gaps.map(g => (
                <li key={g.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                  <span className="font-medium"><MathText text={g.label} /></span>
                  <span className="text-sm text-muted-foreground">{g.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3 border-t border-hairline px-(--card-spacing) pt-6">
          <h2 className="font-display text-h4 font-semibold">{t('diagnostic.result.mastered.title')}</h2>
          {r.mastered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('diagnostic.result.mastered.empty')}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {r.mastered.map(m => <li key={m.id} className="py-2.5 first:pt-0 last:pb-0"><MathText text={m.label} /></li>)}
            </ul>
          )}
        </section>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
