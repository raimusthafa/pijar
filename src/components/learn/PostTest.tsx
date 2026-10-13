'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { AnswerOption } from '@/components/ui/answer-option';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InlineText } from './RichText';
import { useT } from '@/lib/i18n/client';
import { MASTERY_THRESHOLD } from '@/lib/mastery/engine';
import type { QuizEvaluationResult } from '@/lib/learn/types';
import type { CurriculumEdge, CurriculumNode } from '@/types';

interface PublicQuestion { id: string; question: string; options: string[] }
type Result = QuizEvaluationResult & { weakConcepts?: string[] };

interface PostTestProps {
  topic: string;
  nodeId: string;
  graphId: string;
  label: string;
  graph: { nodes: CurriculumNode[]; edges: CurriculumEdge[] } | null;
  onPassed: () => void;
  /** Where the primary action goes when there is no next node. */
  mapHref: string;
  nextHref: (nodeId: string) => string;
}

type Phase = 'intro' | 'loading' | 'loadError' | 'answering' | 'submitting' | 'result';

export function PostTest({ topic, nodeId, graphId, label, graph, onPassed, mapHref, nextHref }: PostTestProps) {
  const { t, locale } = useT();
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const topRef = useRef<HTMLElement>(null);

  async function load() {
    setPhase('loading');
    try {
      const qs = new URLSearchParams({ topic, nodeId, label, language: locale });
      const res = await fetch(`/api/learn/post-test?${qs}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.questions) || data.questions.length === 0) throw new Error('empty');
      setQuestions(data.questions);
      setPhase('answering');
    } catch {
      setPhase('loadError');
    }
  }

  async function submit() {
    setPhase('submitting');
    setSubmitError(false);
    try {
      const res = await fetch('/api/learn/evaluate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, nodeId, graphId, answers, postTest: true, language: locale,
          nodes: graph?.nodes ?? [], edges: graph?.edges ?? [],
        }),
      });
      const data = await res.json();
      if (!data.success || !data.result) throw new Error('eval');
      setResult(data.result);
      setPhase('result');
      if (data.result.isPassed) onPassed();
      topRef.current?.scrollIntoView({ block: 'start' });
    } catch {
      setSubmitError(true);
      setPhase('answering');
    }
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setPhase('answering');
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  const answered = Object.keys(answers).length;
  const showResult = phase === 'result' && result;
  const nextId = result?.isPassed ? result.unlockedNodeIds?.[0] : undefined;
  const nextLabel = graph?.nodes.find(n => n.id === nextId)?.label;

  return (
    <section ref={topRef} aria-labelledby="posttest-title" className="scroll-mt-4 rounded-card bg-surface p-4 sm:p-6 md:p-8">
      <h2 id="posttest-title" className="font-display text-h3">{t('learn.quiz.title')}</h2>

      {phase === 'intro' && (
        <div className="mt-3 space-y-5">
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {t('learn.quiz.intro', { threshold: MASTERY_THRESHOLD })}
          </p>
          <Button onClick={load}>{t('learn.quiz.start')}</Button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="mt-3 space-y-5" role="status">
          <p className="text-sm text-muted-foreground">{t('learn.quiz.loading')}</p>
          {[0, 1].map(i => (
            <div key={i} className="space-y-3 rounded-inner border border-hairline bg-raised p-5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      )}

      {phase === 'loadError' && (
        <div className="mt-3 space-y-4" role="alert">
          <p className="text-base">{t('learn.quiz.error.load')}</p>
          <Button variant="secondary" onClick={load}>{t('common.action.retry')}</Button>
        </div>
      )}

      {(phase === 'answering' || phase === 'submitting' || showResult) && (
        <div className="mt-4 space-y-4">
          {showResult && (
            <div className="rounded-inner border border-hairline-strong bg-raised p-4 sm:p-5 md:p-6" role="status">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={result.isPassed ? 'success' : 'warning'}>
                  {result.isPassed ? t('learn.quiz.pass') : t('learn.quiz.fail')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('learn.quiz.score.threshold', { threshold: MASTERY_THRESHOLD })}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t('learn.quiz.score.label')}</p>
              <p className="font-display text-h1 leading-none tabular-nums text-foreground">{result.score}%</p>
              <p className="mt-3 max-w-prose text-base leading-relaxed">
                {t(result.isPassed ? 'learn.quiz.pass.body' : 'learn.quiz.fail.body', {
                  correct: result.questionResults.filter(r => r.isCorrect).length,
                  total: result.totalQuestions,
                })}
              </p>
              {!!result.weakConcepts?.length && (
                <div className="mt-4">
                  <p className="text-sm font-medium">{t('learn.quiz.weak.title')}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {result.weakConcepts.map(c => <li key={c}><Badge variant="outline">{c}</Badge></li>)}
                  </ul>
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {result.isPassed ? (
                  <>
                    <Button render={<Link href={nextId ? nextHref(nextId) : mapHref} />} nativeButton={false}>
                      {nextId
                        ? nextLabel ? t('learn.quiz.next', { label: nextLabel }) : t('learn.quiz.next.generic')
                        : t('learn.quiz.backToMap')}
                    </Button>
                    {nextId && (
                      <Button variant="secondary" render={<Link href={mapHref} />} nativeButton={false}>
                        {t('learn.quiz.backToMap')}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button onClick={retry}>{t('learn.quiz.retry')}</Button>
                    <Button variant="secondary" render={<a href="#lesson-top" />} nativeButton={false}>
                      {t('learn.quiz.review')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {!showResult && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('learn.quiz.answered', { n: answered, total: questions.length })}
            </p>
          )}

          <ol className="space-y-4">
            {questions.map((q, qi) => {
              const ev = result?.questionResults.find(r => r.questionId === q.id);
              const chosen = answers[q.id];
              return (
                <li key={q.id} className="rounded-inner border border-hairline bg-raised p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p id={`q-${q.id}`} className="text-base leading-snug font-medium">
                      <span className="mr-2 text-muted-foreground tabular-nums">{qi + 1}.</span>
                      <InlineText text={q.question} />
                    </p>
                    {showResult && ev && (
                      <Badge variant={ev.isCorrect ? 'success' : 'danger'} className="shrink-0">
                        {ev.isCorrect ? t('learn.quiz.correct') : t('learn.quiz.wrong')}
                      </Badge>
                    )}
                  </div>
                  <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="mt-4 space-y-2">
                    {q.options.map((opt, oi) => {
                      const isChosen = chosen === oi;
                      const isRight = showResult && ev?.correctIndex === oi;
                      const isWrongPick = showResult && !!ev && isChosen && !ev.isCorrect;
                      return (
                        <AnswerOption
                          key={oi}
                          role="radio"
                          aria-checked={isChosen}
                          disabled={!!showResult || phase === 'submitting'}
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                          state={isRight ? 'correct' : isWrongPick ? 'wrong' : isChosen ? 'picked' : 'idle'}
                          className="min-h-11 rounded-control py-2.5 disabled:opacity-100"
                        >
                          <InlineText text={opt} />
                          {isRight && <span className="ml-2 text-xs text-muted-foreground">{t('learn.quiz.rightAnswer')}</span>}
                          {isWrongPick && <span className="ml-2 text-xs text-muted-foreground">{t('learn.quiz.yourAnswer')}</span>}
                        </AnswerOption>
                      );
                    })}
                  </div>
                  {showResult && ev && (
                    <p className="mt-4 rounded-control bg-surface px-3 py-2.5 text-sm leading-relaxed">
                      {!ev.isCorrect && ev.userExplanation ? `${ev.userExplanation} ` : ''}
                      <InlineText text={ev.explanation} />
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {!showResult && (
            <div className="space-y-3">
              {submitError && <p role="alert" className="text-sm">{t('learn.quiz.error.submit')}</p>}
              <Button onClick={submit} disabled={answered < questions.length || phase === 'submitting'}>
                {phase === 'submitting' ? t('learn.quiz.submitting') : t('learn.quiz.submit')}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
