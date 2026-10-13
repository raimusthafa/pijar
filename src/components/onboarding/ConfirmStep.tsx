'use client';

import { AlertCircle } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export type Understanding = {
  topic: string;
  start: string;
  level: string | null;
  /** What the learner wrote, shown back so they can see what the reading came from. */
  words: string;
};

export function ConfirmStep({
  status,
  value,
  topic,
  onTopic,
  onBack,
  onConfirm,
  onRetry,
  onAsIs,
}: {
  status: 'loading' | 'error' | 'ready';
  value: Understanding | null;
  topic: string;
  onTopic: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  onAsIs: () => void;
}) {
  const { t } = useT();

  return (
    <>
      <h1 tabIndex={-1} className="text-h3 outline-none">{t('onboarding.confirm.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('onboarding.confirm.subtitle')}</p>

      {status === 'loading' && (
        <div className="mt-7 space-y-5" role="status">
          <p className="text-sm text-muted-foreground">{t('onboarding.confirm.loading')}</p>
          <Skeleton className="h-16 w-full rounded-inner" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      )}

      {status === 'error' && (
        <div className="mt-7">
          <div role="alert" className="flex items-start gap-2.5 rounded-inner border border-hairline bg-raised p-3.5 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.8} aria-hidden />
            <p>{t('onboarding.confirm.err.network')}</p>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={onRetry} className="sm:flex-1">
              {t('onboarding.confirm.retry')}
            </Button>
            <Button variant="secondary" size="lg" onClick={onAsIs} className="sm:flex-1">
              {t('onboarding.confirm.asis')}
            </Button>
          </div>
        </div>
      )}

      {status === 'ready' && value && (
        <div className="mt-7">
          <figure className="rounded-inner bg-raised p-4">
            <figcaption className="text-xs text-muted-foreground">{t('onboarding.confirm.yourwords')}</figcaption>
            <blockquote className="mt-1 line-clamp-4 text-sm">{value.words}</blockquote>
          </figure>

          <div className="mt-5">
            <label htmlFor="confirm-topic" className="mb-1.5 block text-sm font-medium">
              {t('onboarding.confirm.topic')}
            </label>
            <Input
              id="confirm-topic"
              value={topic}
              maxLength={120}
              aria-invalid={!topic.trim() ? true : undefined}
              aria-describedby="confirm-topic-note"
              onChange={(e) => onTopic(e.target.value)}
            />
            <p id="confirm-topic-note" className={`mt-1.5 text-xs ${topic.trim() ? 'text-muted-foreground' : 'text-danger'}`} role={topic.trim() ? undefined : 'alert'}>
              {topic.trim() ? t('onboarding.confirm.topic.hint') : t('onboarding.confirm.err.empty')}
            </p>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            {value.start && (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="text-muted-foreground sm:w-36 sm:shrink-0">{t('onboarding.confirm.start')}</dt>
                <dd>{value.start}</dd>
              </div>
            )}
            {value.level && (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="text-muted-foreground sm:w-36 sm:shrink-0">{t('onboarding.confirm.level')}</dt>
                <dd>{t(`onboarding.confirm.level.${value.level}` as MessageKey)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="lg" onClick={onBack}>
          {t('onboarding.confirm.rewrite')}
        </Button>
        {status === 'ready' && (
          <Button size="lg" onClick={onConfirm} disabled={!topic.trim()}>
            {t('onboarding.confirm.yes')}
          </Button>
        )}
      </div>
    </>
  );
}
