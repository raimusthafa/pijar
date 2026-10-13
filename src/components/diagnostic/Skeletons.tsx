'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';

/** Same shape as a question card so nothing jumps when the real one arrives. */
export function QuestionSkeleton({ title, desc }: { title?: string; desc?: string }) {
  const { t } = useT();
  return (
    <div role="status" aria-label={title || undefined} className="grid gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full rounded-pill" />
      </div>
      <div className="grid gap-5 rounded-card border border-hairline bg-raised p-6">
        <Skeleton className="h-3 w-32" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="grid gap-2">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-inner" />)}
        </div>
        {title && <p className="text-sm font-medium">{title}</p>}
        {title && desc && <p className="-mt-3 text-sm text-muted-foreground">{desc}</p>}
      </div>
      <span className="sr-only">{t('common.state.loading')}</span>
    </div>
  );
}
