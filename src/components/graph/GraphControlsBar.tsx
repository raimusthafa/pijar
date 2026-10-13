'use client';

import { ArrowRight, Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/i18n/client';

export type GraphFilter = 'all' | 'gaps' | 'ready';

/** Top row of the canvas: filter and the jump to the recommended concept. */
export function GraphFilterBar({
  filter,
  onFilter,
  onNext,
  hasNext,
}: {
  filter: GraphFilter;
  onFilter: (f: GraphFilter) => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const { t } = useT();
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
      <Tabs value={filter} onValueChange={(v) => onFilter(v as GraphFilter)}>
        <TabsList aria-label={t('graph.filter.label')} className="border border-hairline bg-raised">
          <TabsTrigger value="all">{t('graph.filter.all')}</TabsTrigger>
          <TabsTrigger value="gaps">{t('graph.filter.gaps')}</TabsTrigger>
          <TabsTrigger value="ready">{t('graph.filter.ready')}</TabsTrigger>
        </TabsList>
      </Tabs>
      {hasNext && (
        <Button variant="secondary" size="sm" onClick={onNext} className="bg-raised">
          {t('graph.ctrl.next')}
          <ArrowRight strokeWidth={1.75} aria-hidden />
        </Button>
      )}
    </div>
  );
}

/** Zoom and fit, built from the foundation icon buttons. */
export function GraphZoomBar({ onZoomIn, onZoomOut, onFit }: { onZoomIn: () => void; onZoomOut: () => void; onFit: () => void }) {
  const { t } = useT();
  const items = [
    { label: t('graph.ctrl.zoomIn'), onClick: onZoomIn, Icon: Plus },
    { label: t('graph.ctrl.zoomOut'), onClick: onZoomOut, Icon: Minus },
    { label: t('graph.ctrl.fit'), onClick: onFit, Icon: Maximize },
  ];
  return (
    <div role="group" className="flex flex-col gap-1 rounded-pill border border-hairline bg-raised p-1">
      {items.map(({ label, onClick, Icon }) => (
        <Button key={label} variant="ghost" size="icon-sm" aria-label={label} title={label} onClick={onClick}>
          <Icon strokeWidth={1.75} aria-hidden />
        </Button>
      ))}
    </div>
  );
}
