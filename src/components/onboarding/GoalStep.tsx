'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import type { LearningGoal } from '@/lib/onboarding/goals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const EXAMPLES = ['onboarding.goal.example.1', 'onboarding.goal.example.2', 'onboarding.goal.example.3'] as const;
const MIN_LENGTH = 6;

export function GoalStep({
  text,
  onText,
  onSubmit,
  goals,
  goalsLoading,
  onUseGoal,
}: {
  text: string;
  onText: (v: string) => void;
  onSubmit: () => void;
  goals: LearningGoal[];
  goalsLoading: boolean;
  onUseGoal: (g: LearningGoal) => void;
}) {
  const { t } = useT();
  const [touched, setTouched] = useState(false);
  const len = text.trim().length;
  const problem = len === 0 ? 'empty' : len < MIN_LENGTH ? 'short' : null;
  const error = touched && problem ? t(`onboarding.goal.err.${problem}` as MessageKey) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!problem) onSubmit();
  }

  return (
    <>
      <h1 tabIndex={-1} className="text-h3 outline-none">{t('onboarding.goal.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('onboarding.goal.subtitle')}</p>

      <form onSubmit={submit} noValidate className="mt-7">
        <label htmlFor="goal-text" className="mb-1.5 block text-sm font-medium">
          {t('onboarding.goal.label')}
        </label>
        <Textarea
          id="goal-text"
          rows={4}
          maxLength={400}
          value={text}
          placeholder={t('onboarding.goal.placeholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby="goal-note"
          onChange={(e) => onText(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <p id="goal-note" role={error ? 'alert' : undefined} className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-muted-foreground'}`}>
          {error ?? t('onboarding.goal.hint')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('onboarding.goal.examples')}</span>
          {EXAMPLES.map((k) => (
            <Button key={k} type="button" variant="secondary" size="xs" onClick={() => onText(t(k))}>
              {t(k)}
            </Button>
          ))}
        </div>

        <Button type="submit" size="lg" className="mt-7 w-full">
          {t('onboarding.goal.submit')}
        </Button>
      </form>

      {goalsLoading ? (
        <div className="mt-9" role="status">
          <span className="sr-only">{t('onboarding.history.loading')}</span>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-14 w-full rounded-inner" />
        </div>
      ) : (
        goals.length > 0 && (
          <section className="mt-9" aria-labelledby="history-title">
            <h2 id="history-title" className="text-sm font-medium">
              {t('onboarding.history.title')}
            </h2>
            <ul className="mt-3 space-y-2">
              {goals.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-inner bg-raised p-3 pl-4">
                  <span className="min-w-0 basis-full truncate text-sm sm:flex-1 sm:basis-0">{g.topic}</span>
                  <Badge variant={g.status === 'active' ? 'success' : g.status === 'done' ? 'neutral' : 'outline'}>
                    {t(`onboarding.history.${g.status}` as MessageKey)}
                  </Badge>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto sm:ml-0" onClick={() => onUseGoal(g)}>
                    {t('onboarding.history.use')}
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm">
              <Link href="/dashboard" className="text-muted-foreground underline underline-offset-4 decoration-hairline-strong hover:text-foreground hover:decoration-foreground">
                {t('onboarding.home')}
              </Link>
            </p>
          </section>
        )
      )}
    </>
  );
}
