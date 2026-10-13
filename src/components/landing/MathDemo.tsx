'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MathVisual } from '@/components/learn/visuals/MathVisual';
import { Button } from '@/components/ui/button';
import { DEFAULT_MATH_SPECS } from '@/lib/learn/math-spec';
import { useT } from '@/lib/i18n/client';

const DURATION = 4500;

/**
 * The real MathVisual with a valid MathSpec. Plays once when it scrolls into view (progress 0 to 1),
 * can be replayed, and becomes draggable when it finishes. Under reduced motion it shows the final frame.
 */
export function MathDemo() {
  const { t } = useT();
  const box = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [progress, setProgress] = useState(1);

  const play = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = box.current;
    if (isReduced || !el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        play();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [play]);

  return (
    <div ref={box} className="flex flex-col gap-3">
      <MathVisual spec={DEFAULT_MATH_SPECS.tangent} progress={progress} interactive={progress === 1} />
      <Button variant="secondary" size="sm" className="self-start motion-reduce:hidden" onClick={play}>
          <RotateCcw strokeWidth={1.75} />
          {t('landing.fitur.math.replay')}
        </Button>
    </div>
  );
}
