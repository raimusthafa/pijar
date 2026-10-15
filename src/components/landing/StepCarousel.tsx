'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MessageKey } from '@/lib/i18n/messages';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { ConceptCard } from './ConceptCard';

const PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate'] as const;

/** Three decay curves that restart at each review. Pure shape, no data. */
function curvePath() {
  const seg = (x0: number, x1: number, k: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const x = x0 + (x1 - x0) * u;
      const y = 8 + 52 * (1 - Math.exp(-k * u));
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return [seg(8, 80, 2.4), seg(80, 180, 1.8), seg(180, 292, 1.2)].join(' ');
}
const CURVE = curvePath();
// Align the first card with the page content while letting the track bleed to the viewport edge.
const EDGE = 'calc(max(0px, (100% - var(--pj-content-max)) / 2) + var(--g))';

function Snippet({ n }: { n: number }) {
  const { t } = useT();
  if (n === 1)
    return (
      <div className="flex flex-col gap-3">
        <p className="font-display text-lg font-semibold tracking-[-0.02em]">{t('landing.how.step.1.q')}</p>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4, 5].map((v) => (
            <span key={v} className="inline-flex h-9 min-w-16 items-center justify-center rounded-pill border border-hairline-strong px-4 text-sm font-medium">
              x = {v}
            </span>
          ))}
        </div>
      </div>
    );
  if (n === 2)
    return (
      <div className="grid grid-cols-2 gap-3">
        <ConceptCard category={t('landing.node.cat.aljabar')} title={t('landing.node.n2')} status="gap" statusLabel={t('landing.status.gap')} className="border-amber" />
        <ConceptCard category={t('landing.node.cat.kalkulus')} title={t('landing.node.n5')} status="locked" statusLabel={t('landing.status.locked')} />
      </div>
    );
  if (n === 3)
    return (
      <div className="flex flex-col gap-1">
        <p className="font-display text-2xl font-semibold tracking-[-0.03em]">f(x) = x²</p>
        <p className="text-sm text-muted-foreground">{t('landing.how.step.3.cap')}</p>
      </div>
    );
  if (n === 4)
    return (
      <div className="flex flex-wrap gap-2">
        {PHASES.map((p) => (
          <Badge key={p} variant={p === 'explain' ? 'accent' : 'outline'} className="h-8 px-3 text-sm">
            {t(`landing.phase.${p}` as MessageKey)}
          </Badge>
        ))}
      </div>
    );
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 300 72" role="img" aria-label={t('landing.how.step.5.cap')} className="h-16 w-full overflow-visible">
        <path d={CURVE} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-ink" />
        {[80, 180].map((x) => (
          <circle key={x} cx={x} cy={8} r={5} className="fill-amber" />
        ))}
        <circle cx={8} cy={8} r={5} className="fill-amber" />
      </svg>
      <figcaption className="text-sm text-muted-foreground">{t('landing.how.step.5.cap')}</figcaption>
    </figure>
  );
}

/** Horizontal scroll-snap carousel of the five steps. The leftmost card in view gets the amber tone. */
export function StepCarousel() {
  const { t } = useT();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const seen = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = cards.indexOf(e.target as HTMLElement);
          if (e.isIntersecting) seen.add(i);
          else seen.delete(i);
        }
        if (seen.size) setActive(Math.min(...seen));
      },
      { root: el, threshold: 0.6 },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={track}
        tabIndex={0}
        role="region"
        aria-label={t('landing.how.title.a')}
        className="flex snap-x snap-mandatory gap-9 overflow-x-auto pb-2 [--g:var(--pj-gutter)] [scrollbar-width:none] md:[--g:var(--pj-gutter-lg)] [&::-webkit-scrollbar]:hidden"
        style={{ paddingInline: EDGE, scrollPaddingInline: EDGE }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <article
            key={n}
            className={cn(
              'flex min-h-[420px] w-[min(82vw,420px)] shrink-0 snap-start flex-col gap-4 rounded-card-lg p-6 transition-colors duration-300 ease-out-pj md:p-9',
              active === n - 1 ? 'pj-hero-card' : 'bg-surface',
            )}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-pill bg-raised font-display text-lg font-semibold">{n}</span>
            <h3 className="text-h3">{t(`landing.how.step.${n}.title` as MessageKey)}</h3>
            <p className="text-base text-foreground/80">{t(`landing.how.step.${n}.body` as MessageKey)}</p>
            <div className="mt-auto rounded-inner bg-raised p-4">
              <Snippet n={n} />
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          aria-label={t('landing.how.prev')}
          disabled={active === 0}
          onClick={() => go(active - 1)}
          className="pj-press inline-flex size-11 items-center justify-center rounded-pill border border-hairline-strong bg-raised transition-colors hover:bg-hover disabled:bg-disabled disabled:text-disabled-foreground"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={t('landing.how.next')}
          disabled={active === 4}
          onClick={() => go(active + 1)}
          className="pj-press inline-flex size-11 items-center justify-center rounded-pill border border-hairline-strong bg-raised transition-colors hover:bg-hover disabled:bg-disabled disabled:text-disabled-foreground"
        >
          <ArrowRight className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
