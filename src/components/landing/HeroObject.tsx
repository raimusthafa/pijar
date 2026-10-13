'use client';

import { useEffect, useRef } from 'react';
import type { MessageKey } from '@/lib/i18n/messages';
import { useT } from '@/lib/i18n/client';
import { ConceptCard, type ConceptStatus } from './ConceptCard';

/*
  Decorative 3D object (E2) with no 3D library: four concept cards placed on the Pijar logo geometry
  (three ink nodes and one amber node, same edges), lifted to different depths with CSS perspective.
  Idle float is 5px over 6s. Pointer parallax tilts the stage a few degrees. Both pause offscreen and stop
  under prefers-reduced-motion.
*/
const NODES: { id: string; x: number; y: number; z: number; cat: string; label: string; status: ConceptStatus }[] = [
  { id: 'top', x: 50, y: 13, z: 70, cat: 'kalkulus', label: 'n5', status: 'locked' },
  { id: 'left', x: 19, y: 50, z: 25, cat: 'aljabar', label: 'n3', status: 'ready' },
  { id: 'bottom', x: 50, y: 87, z: 90, cat: 'aljabar', label: 'n2', status: 'gap' },
  { id: 'right', x: 81, y: 50, z: 45, cat: 'kalkulus', label: 'n4', status: 'locked' },
];
// Edges from the logo: top-left and left-bottom in ink, top-right and right-bottom in amber.
const EDGES: { a: string; b: string; amber?: boolean }[] = [
  { a: 'top', b: 'left' },
  { a: 'left', b: 'bottom' },
  { a: 'top', b: 'right', amber: true },
  { a: 'right', b: 'bottom', amber: true },
];
const BASE_X = 9;
const BASE_Y = -14;

const CSS = `.lp-float{animation:lp-float 6s ease-in-out infinite;animation-play-state:paused}
.lp-float[data-on="true"]{animation-play-state:running}
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@media (prefers-reduced-motion:reduce){.lp-float{animation:none}}`;

export function HeroObject() {
  const { t } = useT();
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const float = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const fl = float.current;
    if (!el || !st || !fl) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let on = false;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const px = e.clientX / window.innerWidth - 0.5;
        const py = e.clientY / window.innerHeight - 0.5;
        st.style.transform = `rotateX(${BASE_X - py * 8}deg) rotateY(${BASE_Y + px * 12}deg)`;
      });
    };
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      if (visible === on) return;
      on = visible;
      fl.dataset.on = String(visible);
      if (visible) window.addEventListener('pointermove', onMove, { passive: true });
      else {
        window.removeEventListener('pointermove', onMove);
        cancelAnimationFrame(raf);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  return (
    <div ref={root} role="img" aria-label={t('landing.hero.object.label')} className="mx-auto w-full max-w-[680px] [perspective:1400px]">
      <style>{CSS}</style>
      <div ref={float} className="lp-float" aria-hidden="true">
        <div
          ref={stage}
          className="relative aspect-[0.82] w-full sm:aspect-[1.08] transition-transform duration-300 ease-out-pj [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: `rotateX(${BASE_X}deg) rotateY(${BASE_Y}deg)` }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {EDGES.map((e) => (
              <line
                key={e.a + e.b}
                x1={byId[e.a].x}
                y1={byId[e.a].y}
                x2={byId[e.b].x}
                y2={byId[e.b].y}
                strokeWidth={5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={e.amber ? 'stroke-amber' : 'stroke-ink'}
              />
            ))}
          </svg>
          {NODES.map((n) => (
            <div
              key={n.id}
              className="absolute w-[38%] sm:w-[36%]"
              style={{ left: `${n.x}%`, top: `${n.y}%`, transform: `translate(-50%,-50%) translateZ(${n.z}px)` }}
            >
              <ConceptCard
                category={t(`landing.node.cat.${n.cat}` as MessageKey)}
                title={t(`landing.node.${n.label}` as MessageKey)}
                status={n.status}
                statusLabel={t(`landing.status.${n.status}` as MessageKey)}
                className={n.status === 'gap' ? 'border-amber' : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
