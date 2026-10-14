'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

export type GeneratingStage = { key: string; label: string; detail?: string };

/** Stages from `common.generating.<flow>.<key>` and `common.generating.<flow>.<key>.detail`. */
export function useStages(flow: string, keys: string[]): GeneratingStage[] {
  const { t } = useT();
  return keys.map((k) => ({
    key: k,
    label: t(`common.generating.${flow}.${k}` as MessageKey),
    detail: t(`common.generating.${flow}.${k}.detail` as MessageKey),
  }));
}

/**
 * One calm full-page wait for work that blocks the whole page (a lesson, a map, a question set).
 * Stage labels come from the caller and must match what the server really does. Timed advance is
 * pacing only: it never passes the last stage, never shows a percentage, and never says "done".
 * `stage` is the caller's real floor (a request that finished); `ceil` stops timed advance below a
 * stage the server has not reached yet. `error` swaps the screen for an error with retry.
 */
export function GeneratingScreen({
  title,
  stages,
  stage,
  ceil,
  paceMs = 7000,
  hint,
  hintAfterMs = 8000,
  error = false,
  errorTitle,
  errorBody,
  onRetry,
  className,
}: {
  title: string;
  stages: GeneratingStage[];
  stage?: number;
  ceil?: number;
  paceMs?: number | number[];
  hint?: string;
  hintAfterMs?: number;
  error?: boolean;
  errorTitle?: string;
  errorBody?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useT();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (error) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 400);
    return () => clearInterval(id);
  }, [error]);

  const last = stages.length - 1;
  let timed = 0;
  for (let acc = 0, i = 0; i < last; i++) {
    acc += Array.isArray(paceMs) ? (paceMs[i] ?? paceMs[paceMs.length - 1] ?? 7000) : paceMs;
    if (elapsed >= acc) timed = i + 1;
  }
  const index = Math.max(0, Math.min(last, Math.max(stage ?? 0, Math.min(timed, ceil ?? last))));
  const current = stages[index];
  const showHint = !error && elapsed >= hintAfterMs;

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('flex h-full min-h-[28rem] w-full flex-col items-center justify-center px-5 py-16', className)}>
        <style>{EMBLEM_CSS}</style>
        <Emblem still={error} />

        {error ? (
          <div role="alert" className="mt-8 flex max-w-sm flex-col items-center gap-3 text-center">
            <h2 className="font-display text-h3">{errorTitle ?? t('common.generating.error.title')}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{errorBody ?? t('common.generating.error.body')}</p>
            {onRetry && <Button className="mt-2" onClick={onRetry}>{t('common.generating.error.retry')}</Button>}
          </div>
        ) : (
          <div aria-busy="true" className="mt-8 flex w-full max-w-sm flex-col items-center">
            <h2 className="text-center font-display text-h3">{title}</h2>
            <ol className="mt-7 grid w-full gap-3">
              {stages.map((s, i) => {
                const done = i < index;
                const active = i === index;
                return (
                  <li key={s.key} aria-current={active ? 'step' : undefined} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-pill transition-colors duration-200',
                        done && 'bg-ink text-background',
                        active && 'bg-amber',
                        !done && !active && 'border border-hairline-strong',
                      )}
                    >
                      {done && <Check className="size-3.5" strokeWidth={2.5} />}
                      {active && <span className={cn('size-2 rounded-pill bg-ink', i === last && 'pj-gen-pulse')} />}
                    </span>
                    <span
                      className={cn(
                        'text-sm transition-colors duration-200',
                        active ? 'font-medium text-foreground' : done ? 'text-muted-foreground' : 'text-text-faint',
                      )}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="relative mt-6 mb-3 min-h-14 w-full">
              <AnimatePresence initial={false} mode="wait">
                {current.detail && (
                  <motion.p
                    key={current.key}
                    initial={{ opacity: 0, transform: 'translateY(4px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {current.detail}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <p
              aria-hidden={!showHint}
              className={cn(
                'min-h-10 w-full text-xs leading-relaxed text-muted-foreground transition-opacity duration-300',
                showHint ? 'opacity-100' : 'opacity-0',
              )}
            >
              {hint ?? t('common.generating.hint.default')}
            </p>
            <p role="status" aria-live="polite" className="sr-only">
              {`${index + 1}/${stages.length}: ${current.label}`}
            </p>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// The Pijar mark redrawn as 8 parts on a loop: node, link, node, link, around the ring.
// Geometry is Logo.tsx's. Each part sits at a translate and animates scale and opacity from its own origin.
const PARTS: { kind: 'node' | 'link'; x: number; y: number; d?: string; amber?: boolean }[] = [
  { kind: 'node', x: 179, y: 83 },
  { kind: 'link', x: 155, y: 96, d: 'M0 0 -50 46' },
  { kind: 'node', x: 76, y: 178 },
  { kind: 'link', x: 94, y: 196, d: 'M0 0 65 55' },
  { kind: 'node', x: 179, y: 266 },
  { kind: 'link', x: 212, y: 242, d: 'M0 0 40 -33', amber: true },
  { kind: 'node', x: 280, y: 178, amber: true },
  { kind: 'link', x: 252, y: 143, d: 'M0 0 -44 -41', amber: true },
];

const CYCLE_S = 6;
const EMBLEM_CSS =
  PARTS.map((_, i) => {
    const a = 3 + i * 9; // where this part starts to appear, in percent of the cycle
    return `@keyframes pj-gen-${i}{0%,${a}%{opacity:0;transform:scale(.6)}${a + 6}%{opacity:1;transform:scale(1)}88%{opacity:1;transform:scale(1)}96%,100%{opacity:0;transform:scale(1)}}`;
  }).join('') +
  `.pj-gen-part{transform-origin:0 0;opacity:0;animation-duration:${CYCLE_S}s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.23,1,.32,1)}` +
  PARTS.map((_, i) => `.pj-gen-part[data-i="${i}"]{animation-name:pj-gen-${i}}`).join('') +
  `.pj-gen-still{opacity:1}` +
  `@keyframes pj-gen-pulse{0%,100%{opacity:1}50%{opacity:.35}}.pj-gen-pulse{animation:pj-gen-pulse 1.6s ease-in-out infinite}` +
  `@media (prefers-reduced-motion:reduce){.pj-gen-part{animation:none;opacity:1}.pj-gen-pulse{animation:none}}`;

function Emblem({ still }: { still: boolean }) {
  const cls = (i: number, amber?: boolean, tone?: 'stroke' | 'fill') =>
    cn(still ? 'pj-gen-still' : 'pj-gen-part', tone === 'stroke' ? (amber ? 'stroke-amber' : 'stroke-ink') : amber ? 'fill-amber' : 'fill-ink');
  return (
    <svg viewBox="40 47 276 256" width="88" height="82" aria-hidden className="shrink-0">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15">
        {PARTS.map((p, i) =>
          p.kind === 'link' ? (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <path d={p.d} data-i={i} className={cls(i, p.amber, 'stroke')} />
            </g>
          ) : null,
        )}
      </g>
      {PARTS.map((p, i) =>
        p.kind === 'node' ? (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <circle r="33" data-i={i} className={cls(i, p.amber, 'fill')} />
          </g>
        ) : null,
      )}
    </svg>
  );
}
