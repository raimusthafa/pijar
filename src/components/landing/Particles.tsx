'use client';

import { useEffect, useRef } from 'react';

/*
  Ambient particle field (E2): 24 small dots drifting up at 4 to 10 px/s. Runs only while on screen and the tab is
  visible. Under prefers-reduced-motion it draws one still frame.
*/
const COUNT = 24;

export function Particles({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const dots = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 1.2,
      v: 4 + Math.random() * 6,
      a: 0.45 + Math.random() * 0.4,
    }));
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.y -= (d.v * dt) / h;
        if (d.y < -0.02) {
          d.y = 1.02;
          d.x = Math.random();
        }
        ctx.globalAlpha = d.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (reduced) return () => ro.disconnect();

    let raf = 0;
    let last = 0;
    let visible = false;
    const tick = (now: number) => {
      draw(Math.min((now - last) / 1000, 0.1));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
