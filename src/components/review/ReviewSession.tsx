'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarCheck, CircleAlert } from 'lucide-react';
import { AnswerOption } from '@/components/ui/answer-option';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';
import { daysUntilDue } from '@/lib/dashboard/derive';
import { DUE_RETENTION } from '@/lib/scheduler/engine';

interface Question { id: string; question: string; options: string[]; correctIndex: number; explanation: string }
interface Item { nodeId: string; label: string; retention: number; question?: Question }
interface Result { nodeId: string; label: string; correct: boolean; stability?: number }

type Phase =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty'; graphId: string | null; practice: Item[] }
  | { kind: 'asking'; graphId: string; items: Item[] }
  | { kind: 'saving'; graphId: string; results: Result[] }
  | { kind: 'saveError'; graphId: string; results: Result[] }
  | { kind: 'done'; graphId: string; results: Result[]; persisted: boolean };

/** One question at a time with immediate feedback, then a summary of what comes back sooner and later. */
export function ReviewSession({ graphId: requested }: { graphId?: string }) {
  const { t, locale } = useT();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ language: locale });
        if (requested) qs.set('graphId', requested);
        const res = await fetch(`/api/review/today?${qs}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error();
        const items = ((json.items ?? []) as Item[]).filter(i => i.question);
        const due = items.filter(i => i.retention < DUE_RETENTION);
        if (cancelled) return;
        if (!json.graphId || items.length === 0) setPhase({ kind: 'empty', graphId: json.graphId ?? null, practice: [] });
        else if (due.length === 0) setPhase({ kind: 'empty', graphId: json.graphId, practice: items });
        else setPhase({ kind: 'asking', graphId: json.graphId, items: due });
      } catch {
        if (!cancelled) setPhase({ kind: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [locale, requested, attempt]);

  const retry = () => { setPhase({ kind: 'loading' }); setAttempt(a => a + 1); };

  const save = useCallback(async (graphId: string, results: Result[]) => {
    setPhase({ kind: 'saving', graphId, results });
    try {
      const res = await fetch('/api/review/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphId, results: results.map(r => ({ nodeId: r.nodeId, correct: r.correct })) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      const stab = new Map<string, number>((json.updated ?? []).map((u: { nodeId: string; stability_days: number }) => [u.nodeId, u.stability_days]));
      setPhase({
        kind: 'done',
        graphId,
        persisted: json.persisted !== false,
        results: results.map(r => ({ ...r, stability: stab.get(r.nodeId) })),
      });
    } catch {
      setPhase({ kind: 'saveError', graphId, results });
    }
  }, []);

  switch (phase.kind) {
    case 'loading':
      return <Waiting />;
    case 'error':
      return (
        <Card tone="raised">
          <div role="alert" className="grid justify-items-start gap-3 px-(--card-spacing)">
            <p className="flex items-center gap-2 text-sm"><CircleAlert className="size-4" strokeWidth={1.75} aria-hidden />{t('review.error.load')}</p>
            <Button variant="secondary" size="sm" onClick={retry}>{t('common.action.retry')}</Button>
          </div>
        </Card>
      );
    case 'empty':
      return (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title={t('review.empty.title')}
            description={
              phase.practice.length
                ? `${t('review.empty.desc')} ${t('review.empty.practiceHint', { n: phase.practice.length })}`
                : t('review.empty.desc')
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {phase.practice.length > 0 && phase.graphId && (
                  <Button onClick={() => setPhase({ kind: 'asking', graphId: phase.graphId!, items: phase.practice })}>
                    {t('review.empty.practice')}
                  </Button>
                )}
                <Button variant="secondary" render={<Link href="/graph" />} nativeButton={false}>{t('review.empty.map')}</Button>
              </div>
            }
          />
        </Card>
      );
    case 'asking':
      return <Questions key={phase.graphId} items={phase.items} onFinish={r => save(phase.graphId, r)} />;
    case 'saving':
      return <p role="status" className="text-sm text-muted-foreground">{t('review.saving')}</p>;
    case 'saveError':
      return (
        <Card tone="raised">
          <div role="alert" className="grid justify-items-start gap-3 px-(--card-spacing)">
            <p className="flex items-center gap-2 text-sm"><CircleAlert className="size-4" strokeWidth={1.75} aria-hidden />{t('review.error.save')}</p>
            <Button variant="secondary" size="sm" onClick={() => save(phase.graphId, phase.results)}>{t('common.action.retry')}</Button>
          </div>
        </Card>
      );
    case 'done':
      return <Summary results={phase.results} persisted={phase.persisted} />;
  }
}

/** Skeleton shaped like the question card. After a few seconds it says why it is slow, because generating questions can take a while. */
function Waiting() {
  const { t } = useT();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="grid gap-5" role="status">
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">{t(slow ? 'review.loading.slow' : 'review.loading')}</p>
        <Skeleton className="h-2 w-full rounded-pill" />
      </div>
      <Card tone="raised" className="gap-5">
        <div className="grid gap-5 px-(--card-spacing)">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-5 w-4/5" />
          <div className="grid gap-2">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-inner" />)}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Questions({ items, onFinish }: { items: Item[]; onFinish: (r: Result[]) => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);

  const item = items[index];
  const q = item.question!;
  const answered = picked !== null;
  const correct = picked === q.correctIndex;
  const last = index === items.length - 1;

  useEffect(() => { if (answered) nextRef.current?.focus(); }, [answered]);

  // 1 to 4 pick an answer, so a whole review runs without the mouse.
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < q.options.length) choose(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, index]);

  function choose(i: number) {
    if (answered) return;
    setPicked(i);
    setResults(r => [...r, { nodeId: item.nodeId, label: item.label, correct: i === q.correctIndex }]);
  }

  function advance() {
    if (last) return onFinish(results);
    setIndex(index + 1);
    setPicked(null);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          {t('review.progress', { current: index + 1, total: items.length })}
        </p>
        <Progress value={((index + (answered ? 1 : 0)) / items.length) * 100} aria-label={t('review.progress', { current: index + 1, total: items.length })} />
      </div>

      <Card key={index} tone="raised" className="pj-rise gap-5">
        <div className="grid gap-5 px-(--card-spacing)">
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">{t('review.concept', { label: item.label })}</p>
            <p className="text-xs text-muted-foreground">{t('review.recall', { pct: Math.round(item.retention * 100) })}</p>
          </div>
          <h2 className="font-display text-h4 font-semibold">{q.question}</h2>

          <div role="group" aria-label={t('review.options')} className="grid gap-2">
            {q.options.map((opt, i) => (
              <AnswerOption
                key={i}
                keyHint={i + 1}
                aria-keyshortcuts={String(i + 1)}
                state={!answered ? 'idle' : i === q.correctIndex ? 'correct' : i === picked ? 'wrong' : 'dim'}
                disabled={answered}
                onClick={() => choose(i)}
              >
                {opt}
              </AnswerOption>
            ))}
          </div>

          <div role="status" aria-live="polite" className="min-h-6">
            {answered && (
              <div className="pj-rise grid gap-1 text-sm">
                <p className="font-medium">{correct ? t('review.correct') : t('review.wrong')}</p>
                {!correct && <p>{t('review.correctWas', { answer: q.options[q.correctIndex] })}</p>}
                {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button ref={nextRef} onClick={advance} disabled={!answered}>
              {last ? t('review.finish') : t('review.next')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Summary({ results, persisted }: { results: Result[]; persisted: boolean }) {
  const { t } = useT();
  const sooner = results.filter(r => !r.correct);
  const later = results.filter(r => r.correct);
  const when = (r: Result) => {
    if (r.stability === undefined) return null;
    const d = daysUntilDue(r.stability);
    return d < 1 ? t('review.summary.in.lt1') : t('review.summary.in.days', { n: Math.round(d) });
  };

  const group = (title: string, desc: string, list: Result[], delay: number) =>
    list.length > 0 && (
      <Card size="sm" tone="raised" className="pj-rise" style={{ '--pj-i': delay } as React.CSSProperties}>
        <div className="grid gap-3 px-(--card-spacing)">
          <div>
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <ul className="grid gap-2">
            {list.map(r => (
              <li key={r.nodeId} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{when(r)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    );

  return (
    <div className="grid gap-4">
      <Card className="pj-rise">
        <div className="grid gap-1 px-(--card-spacing)">
          <h2 className="font-display text-h3 font-semibold">{t('review.summary.title')}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {t('review.summary.score', { correct: later.length, total: results.length })}
          </p>
        </div>
      </Card>
      {group(t('review.summary.sooner.title'), t('review.summary.sooner.desc'), sooner, 1)}
      {group(t('review.summary.later.title'), t('review.summary.later.desc'), later, 2)}
      {!persisted && <p role="alert" className="text-sm">{t('review.summary.unsaved')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/dashboard" />} nativeButton={false}>{t('review.summary.home')}</Button>
        <Button variant="secondary" render={<Link href="/graph" />} nativeButton={false}>{t('review.summary.map')}</Button>
      </div>
    </div>
  );
}
