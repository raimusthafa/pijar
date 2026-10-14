'use client';

import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';
import type { BoardSpec } from '@/lib/learn/board-spec';

function BoardSkeleton() {
  const { t } = useT();
  return (
    <Card tone="raised" role="status" aria-label={t('learn.board.loading')} className="gap-4">
      <div className="grid gap-2 px-(--card-spacing)">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-72 w-full rounded-inner md:h-96" />
        <Skeleton className="h-16 w-full rounded-inner" />
      </div>
    </Card>
  );
}

// JSXGraph reads window on import, so the board is client-only.
const Impl = dynamic(() => import('./InteractiveBoardImpl'), { ssr: false, loading: () => <BoardSkeleton /> });

/** Interactive math board for a validated BoardSpec (see lib/learn/board-spec.ts). */
export function InteractiveBoard({ spec }: { spec: BoardSpec }) {
  return <Impl spec={spec} />;
}
