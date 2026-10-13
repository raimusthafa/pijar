'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MathSpec } from '@/lib/learn/types';
import { describeMathSpec } from '@/lib/learn/math-spec';

// Mafs measures the DOM, so it is loaded on the client only.
const MathCanvas = dynamic(() => import('./MathCanvas'), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full animate-pulse rounded-md bg-muted" aria-hidden="true" />,
});

interface MathVisualProps {
  spec: MathSpec;
  /** 0..1 progress through the current scene. */
  progress: number;
  /** Dragging is only offered while the player is paused or the scene is finished. */
  interactive?: boolean;
}

// Mafs sets its variables on .MafsView itself, so they must be overridden there (scoped to this component).
const THEME_CSS = `.pj-math .MafsView{--mafs-bg:transparent;--mafs-fg:var(--pj-ink,var(--foreground,currentColor));--mafs-line-color:var(--border,currentColor)}`;

export function MathVisual({ spec, progress, interactive = false }: MathVisualProps) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const description = describeMathSpec(spec);
  return (
    <div className="pj-math w-full rounded-lg border border-border bg-card p-3 text-foreground">
      <style>{THEME_CSS}</style>
      <div role="img" aria-label={description}>
        <MathCanvas spec={spec} progress={reduced ? 1 : progress} interactive={interactive} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
