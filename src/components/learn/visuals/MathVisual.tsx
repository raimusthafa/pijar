'use client';

import React, { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import type { MathSpec } from '@/lib/learn/types';
import { Skeleton } from '@/components/ui/skeleton';
import { describeMathSpec } from '@/lib/learn/math-spec';

// Mafs measures the DOM, so it is loaded on the client only.
const MathCanvas = dynamic(() => import('./MathCanvas'), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />,
});

interface MathVisualProps {
  spec: MathSpec;
  /** 0..1 progress through the current scene. */
  progress: number;
  /** Dragging is only offered while the player is paused or the scene is finished. */
  interactive?: boolean;
}

// Mafs sets its variables on .MafsView itself, so they must be overridden there (scoped to this component).
const THEME_CSS = `.pj-math .MafsView{--mafs-bg:transparent;--mafs-fg:var(--pj-ink);--mafs-line-color:var(--pj-hairline-strong)}`;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function MathVisual({ spec, progress, interactive = false }: MathVisualProps) {
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_MOTION).matches, () => false);

  const description = describeMathSpec(spec);
  return (
    <div className="pj-math w-full rounded-inner border border-hairline bg-raised p-4 text-foreground">
      <style>{THEME_CSS}</style>
      <div role="img" aria-label={description}>
        <MathCanvas spec={spec} progress={reduced ? 1 : progress} interactive={interactive} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
