'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    <div className="grid items-start gap-8 lg:grid-cols-[5fr_7fr] lg:gap-12 pt-4">
      {/* Left Column: Recommendation & CTA */}
      <div className="pj-rise grid gap-6 lg:sticky lg:top-8">
        <div className="relative overflow-hidden rounded-card border border-hairline bg-surface p-6 sm:p-8 space-y-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber" aria-hidden />

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-pill bg-amber" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('diagnostic.result.title')}
            </p>
          </div>

          <h1 className="font-display text-h2 md:text-[36px] font-bold tracking-tight text-foreground leading-[1.2]">
            <MathText text={r.startLabel ?? t('diagnostic.result.start.fallback')} />
          </h1>

          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {lead}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {r.graphId && (
              <Button size="lg" render={<Link href={`/graph/${r.graphId}`} />} nativeButton={false}>
                {t('diagnostic.action.map')}
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={onRetake}>
              {t('diagnostic.action.retake')}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Diagnostic Breakdown */}
      <div className="pj-rise grid gap-6" style={{ '--pj-i': 1 } as React.CSSProperties}>
        {/* Metric tiles */}
        <div className="grid grid-cols-3 gap-3">
          <Card tone="raised" size="sm" className="p-4 text-center">
            <dd className="font-display text-h2 font-bold tabular-nums text-foreground">{r.answered}</dd>
            <dt className="text-xs text-muted-foreground mt-1">{t('diagnostic.result.row.answered')}</dt>
          </Card>
          <Card tone="raised" size="sm" className="p-4 text-center">
            <dd className="font-display text-h2 font-bold tabular-nums text-foreground">{r.gaps.length}</dd>
            <dt className="text-xs text-muted-foreground mt-1">{t('diagnostic.result.row.gaps')}</dt>
          </Card>
          <Card tone="raised" size="sm" className="p-4 text-center">
            <dd className="font-display text-h2 font-bold tabular-nums text-foreground">{r.mastered.length}</dd>
            <dt className="text-xs text-muted-foreground mt-1">{t('diagnostic.result.row.mastered')}</dt>
          </Card>
        </div>

        {/* Identified Gaps Card */}
        <Card tone="raised" className="overflow-hidden gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <h2 className="font-display text-h4 font-semibold text-foreground">
              {t('diagnostic.result.gaps.title')}
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              {t('diagnostic.result.row.concepts', { n: r.gaps.length })}
            </span>
          </div>

          {r.gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('diagnostic.result.gaps.empty')}</p>
          ) : (
            <ul className="grid gap-3">
              {r.gaps.map(g => (
                <li key={g.id} className="rounded-inner border border-hairline bg-surface p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground"><MathText text={g.label} /></span>
                    <Badge variant="danger" className="text-xs shrink-0">Gap</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{g.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Mastered Concepts Card */}
        <Card tone="raised" className="overflow-hidden gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <h2 className="font-display text-h4 font-semibold text-foreground">
              {t('diagnostic.result.mastered.title')}
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              {t('diagnostic.result.row.concepts', { n: r.mastered.length })}
            </span>
          </div>

          {r.mastered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('diagnostic.result.mastered.empty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2 pt-1">
              {r.mastered.map(m => (
                <li key={m.id}>
                  <Badge variant="success" className="px-3 py-1">
                    <MathText text={m.label} />
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
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
