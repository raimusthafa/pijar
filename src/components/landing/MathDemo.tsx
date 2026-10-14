'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { normalizeScene } from '@/lib/learn/scene-normalize';
import { useT } from '@/lib/i18n/client';
import type { StageStatus } from '@/components/learn/video/StageView';

// three.js and manim-web load only when this block is on the page, and never on the server.
const StageView = dynamic(() => import('@/components/learn/video/StageView'), { ssr: false });

const DURATION = 12; // seconds of animation
const HOLD = 2.5; // seconds the finished frame stays before the loop restarts

/**
 * The lesson stage with one short scene on a loop: the curve, a tangent that slides along it, and the slope
 * drawn on the lower axes. It starts when it scrolls into view, stops when it leaves, and under reduced motion
 * shows the finished frame and never moves.
 */
export function MathDemo() {
  const { t, locale } = useT();
  const box = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(DURATION); // the finished frame is the poster until playback begins
  const [status, setStatus] = useState<StageStatus>('loading');
  const [near, setNear] = useState(false); // the 300 kB engine is fetched only when the block is about to scroll into view

  const scene = useMemo(
    () =>
      normalizeScene(
        {
          id: 'demo',
          title: t('landing.fitur.math.stage'),
          durationSeconds: DURATION,
          narration: '',
          recipe: { name: 'derivative-tangent', params: { expr: 'sin(x)', label: 'f(x) = \\sin x', derivative: "f'(x) = \\cos x" } },
        },
        0,
        0,
        locale === 'en' ? 'en' : 'id',
      ),
    [t, locale],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      setTime(Math.min(DURATION, ((now - t0) / 1000) % (DURATION + HOLD)));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) {
        t0 = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={box} className="relative aspect-video overflow-hidden rounded-inner bg-action">
      {near && (
      <StageView
        scene={scene}
        runtime={DURATION}
        time={time}
        onStatus={setStatus}
        className="absolute inset-0"
        fallback={<p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-action-foreground/80">{scene.title}</p>}
      />
      )}
      {status === 'loading' && <div className="pj-skeleton pointer-events-none absolute inset-0 bg-action" aria-hidden />}
    </div>
  );
}
