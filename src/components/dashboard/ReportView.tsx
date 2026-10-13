'use client';

import { CalendarDays, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/lib/i18n/client';
import { retentionBars, weeklyReport } from '@/lib/dashboard/derive';
import { DUE_RETENTION, type ReviewRow } from '@/lib/scheduler/engine';
import type { DashboardGraph } from './types';

const BAR_H = 44;

/** Weekly report and retention view. Both come straight from node_progress timestamps. */
export function ReportView({ graph, rows, now }: { graph?: DashboardGraph; rows: ReviewRow[]; now: Date }) {
  const { t, locale } = useT();
  const week = weeklyReport(rows, now);
  const labels = new Map((graph?.nodes ?? []).map(n => [n.id, n.label]));
  const bars = retentionBars(rows, labels, now);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const peak = Math.max(1, ...week.days.map(d => Math.max(d.mastered, d.reviewed)));

  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
      <Card className="pj-rise">
        <div className="grid gap-4 px-(--card-spacing)">
          <h2 className="font-display text-h4 font-semibold">{t('dashboard.report.week.title')}</h2>
          {!week.hasData ? (
            <EmptyState
              icon={CalendarDays}
              title={t('dashboard.report.week.empty.title')}
              description={t('dashboard.report.week.empty.desc')}
              className="py-8"
            />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dd className="font-display text-h2 font-semibold tabular-nums">{week.mastered}</dd>
                  <dt className="text-sm text-muted-foreground">{t('dashboard.report.week.mastered')}</dt>
                </div>
                <div>
                  <dd className="font-display text-h2 font-semibold tabular-nums">{week.reviewed}</dd>
                  <dt className="text-sm text-muted-foreground">{t('dashboard.report.week.reviewed')}</dt>
                </div>
              </dl>

              <svg
                role="img"
                aria-label={t('dashboard.report.week.chart')}
                viewBox={`0 0 210 ${BAR_H + 16}`}
                className="w-full max-w-sm"
              >
                {week.days.map((d, i) => {
                  const x = i * 30 + 3;
                  const h = (n: number) => (n === 0 ? 0 : Math.max(3, (n / peak) * BAR_H));
                  return (
                    <g key={d.daysAgo}>
                      <rect x={x} y={BAR_H - h(d.mastered)} width="11" height={h(d.mastered)} rx="2.5" className="fill-amber" />
                      <rect x={x + 13} y={BAR_H - h(d.reviewed)} width="11" height={h(d.reviewed)} rx="2.5" className="fill-neutral" />
                      <text x={x + 12} y={BAR_H + 12} textAnchor="middle" className="fill-muted-foreground text-[8px]">
                        {weekday.format(new Date(now.getTime() - d.daysAgo * 86_400_000))}
                      </text>
                    </g>
                  );
                })}
                <line x1="0" x2="210" y1={BAR_H + 0.5} y2={BAR_H + 0.5} className="stroke-hairline" />
              </svg>

              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><span className="size-2.5 rounded-control bg-amber" aria-hidden />{t('dashboard.report.legend.mastered')}</li>
                <li className="flex items-center gap-2"><span className="size-2.5 rounded-control bg-neutral" aria-hidden />{t('dashboard.report.legend.reviewed')}</li>
              </ul>
              <p className="text-xs text-muted-foreground">{t('dashboard.report.week.note')}</p>
            </>
          )}
        </div>
      </Card>

      <Card className="pj-rise" style={{ '--pj-i': 1 } as React.CSSProperties}>
        <div className="grid gap-4 px-(--card-spacing)">
          <div className="grid gap-1">
            <h2 className="font-display text-h4 font-semibold">{t('dashboard.report.retention.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('dashboard.report.retention.explain')}</p>
          </div>
          {bars.length === 0 ? (
            <EmptyState
              icon={Brain}
              title={t('dashboard.report.retention.empty.title')}
              description={t('dashboard.report.retention.empty.desc')}
              className="py-8"
            />
          ) : (
            <ul className="grid gap-4">
              {bars.map(b => {
                const pct = Math.round(b.retention * 100);
                return (
                  <li key={b.nodeId} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">{b.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {b.due
                          ? t('dashboard.report.retention.due')
                          : b.daysLeft < 1
                            ? t('dashboard.report.retention.soon')
                            : t('dashboard.report.retention.in', { n: Math.round(b.daysLeft) })}
                      </span>
                    </div>
                    <svg
                      role="img"
                      aria-label={t('dashboard.report.retention.aria', { label: b.label, pct })}
                      width="100%"
                      height="10"
                    >
                      <rect width="100%" height="8" y="1" rx="4" className="fill-surface-strong" />
                      <rect width={`${pct}%`} height="8" y="1" rx="4" className="fill-amber" />
                      <line x1={`${DUE_RETENTION * 100}%`} x2={`${DUE_RETENTION * 100}%`} y1="0" y2="10" className="stroke-foreground" strokeWidth="1.5" />
                    </svg>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
