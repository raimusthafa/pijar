'use client';

import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import type { Q } from './types';

/** One question with 1 to 4 key answers and immediate feedback that says nothing about what comes next. */
export function QuestionPanel({
  q, number, max, fixed, picked, onPick, onNext, last, error, onRetry,
}: {
  q: Q;
  number: number;
  max: number;
  fixed: boolean;          // true in the fixed-length fallback
  picked: number | null;
  onPick: (i: number) => void;
  onNext: () => void;
  last: boolean;
  error: boolean;          // loading the next question failed
  onRetry: () => void;
}) {
  const { t } = useT();
  const answered = picked !== null;
  const correct = picked === q.correctIndex;
  const nextRef = useRef<HTMLButtonElement>(null);
  const progress = t(fixed ? 'diagnostic.progress.fixed' : 'diagnostic.progress.adaptive', { n: number, max, total: max });

  useEffect(() => {
    if (!answered) return;
    nextRef.current?.focus();
  }, [answered]);

  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < q.options.length) onPick(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, q, onPick]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">{progress}</p>
        <Progress value={((number - 1 + (answered ? 1 : 0)) / max) * 100} aria-label={progress} />
      </div>

      <Card key={q.id + number} tone="raised" className="pj-rise gap-5">
        <div className="grid gap-5 px-(--card-spacing)">
          <p className="text-xs text-muted-foreground">{t('diagnostic.question.concept', { label: q.label })}</p>
          <h2 className="font-display text-h4 font-semibold">{q.question}</h2>

          <div role="group" aria-label={t('diagnostic.options.label')} className="grid gap-2">
            {q.options.map((opt, i) => {
              const isPicked = picked === i;
              const isRight = answered && i === q.correctIndex;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={answered && !isPicked && !isRight}
                  aria-disabled={answered}
                  aria-keyshortcuts={String(i + 1)}
                  onClick={() => onPick(i)}
                  className={cn(
                    'pj-press flex min-h-12 items-center gap-3 rounded-inner border px-4 py-2 text-left text-sm transition-colors duration-150',
                    !answered && 'border-field bg-raised hover:bg-hover',
                    isPicked && correct && 'border-transparent bg-success text-success-foreground',
                    isPicked && !correct && 'border-transparent bg-danger text-danger-foreground',
                    answered && isRight && !isPicked && 'border-2 border-success bg-raised',
                    answered && !isPicked && !isRight && 'border-hairline bg-raised text-muted-foreground',
                  )}
                >
                  <kbd aria-hidden className="hidden size-6 shrink-0 place-items-center rounded-control border border-current/30 font-sans text-xs tabular-nums opacity-70 md:grid">{i + 1}</kbd>
                  <span className="min-w-0 flex-1">{opt}</span>
                  {isRight && <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
                  {isPicked && !correct && <X className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
                </button>
              );
            })}
          </div>

          <div role="status" aria-live="polite" className="min-h-6">
            {answered ? (
              <div className="pj-rise grid gap-1 text-sm">
                <p className="font-medium">{correct ? t('diagnostic.feedback.correct') : t('diagnostic.feedback.wrong')}</p>
                {!correct && <p>{t('diagnostic.feedback.correctWas', { answer: q.options[q.correctIndex] })}</p>}
                {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
              </div>
            ) : (
              <p className="hidden text-xs text-muted-foreground md:block">{t('diagnostic.keys.hint')}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm">{t('diagnostic.error.next')}</p>
          )}
          <div className="flex justify-end">
            <Button ref={nextRef} onClick={error ? onRetry : onNext} disabled={!answered}>
              {error ? t('common.action.retry') : last ? t('diagnostic.finish') : t('diagnostic.next')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
