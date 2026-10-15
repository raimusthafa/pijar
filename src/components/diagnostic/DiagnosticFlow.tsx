'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { GeneratingScreen, useStages } from '@/components/ui/generating-screen';
import { useT } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';
import { isMissingGoalsTable } from '@/lib/onboarding/goals';
import { MAX_QUESTIONS, type AdaptiveState } from '@/lib/diagnostic/adaptive';
import { gapDetail } from '@/lib/diagnostic/adaptive-graph';
import type { CognitiveIntakeResult, CurriculumNode } from '@/types';
import { QuestionPanel } from './QuestionPanel';
import { QuestionSkeleton } from './Skeletons';
import { ResultView } from './ResultView';
import type { Graph, Q, ResultData } from './types';

type Stage = 'intro' | 'preparing' | 'quiz' | 'analyzing' | 'result';
interface Ctx { topic: string; goal: string; practitioner: boolean; intake: CognitiveIntakeResult | null; cap: number }
interface Asked { q: Q; picked: number }
interface NextRes { adaptive_state: AdaptiveState; done: boolean; next: { nodeId: string; question: ApiQ } | null }
interface ApiQ { id: string; question: string; options: string[]; correctIndex: number; explanation?: string }

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || String(res.status));
  return data as T;
}

const labelOf = (nodes: CurriculumNode[], id: string) => nodes.find(n => n.id === id)?.label ?? id;
const toQ = (q: ApiQ, nodeId: string, nodes: CurriculumNode[]): Q => ({ ...q, nodeId, label: labelOf(nodes, nodeId) });

function readContext(topicParam?: string): Ctx | null {
  const topic = topicParam || sessionStorage.getItem('pijar_topic');
  if (!topic) return null;
  let intake: CognitiveIntakeResult | null = null;
  try { intake = JSON.parse(sessionStorage.getItem('pijar_intake_context') || 'null'); } catch { /* ignore */ }
  return {
    topic,
    goal: sessionStorage.getItem('pijar_goal') || 'Persiapan Komprehensif',
    practitioner: sessionStorage.getItem('pijar_is_practitioner') === 'true' || Boolean(intake?.is_practitioner_track),
    intake,
    // Length chosen in onboarding (5 or 10); the adaptive test never asks more than that.
    cap: Number(sessionStorage.getItem('pijar_diagnostic_count')) === 5 ? 5 : MAX_QUESTIONS,
  };
}

export function DiagnosticFlow({ topicParam }: { topicParam?: string }) {
  const { t, locale } = useT();
  const [ctx, setCtx] = useState<Ctx | null | undefined>(undefined); // undefined: not read yet
  const [stage, setStage] = useState<Stage>('intro');
  const [startError, setStartError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // The concept map request has finished and only the first question is left (stage 2 of the preparing screen).
  const [mapDone, setMapDone] = useState(false);
  const prepStages = useStages('diagnostic', ['read', 'map', 'first']);
  const saveStages = useStages('save', ['score', 'mark', 'store']);
  const nextStages = useStages('diagnostic', ['next']);

  const [graph, setGraph] = useState<Graph | null>(null);
  const [fixedList, setFixedList] = useState<Q[] | null>(null); // fixed-length fallback
  const [current, setCurrent] = useState<Q | null>(null);
  const [number, setNumber] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [nextDone, setNextDone] = useState(false);
  const [nextError, setNextError] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);

  const adaptiveRef = useRef<AdaptiveState | null>(null);
  const askedRef = useRef<Asked[]>([]);
  const pendingRef = useRef<Promise<NextRes> | null>(null);
  const lastCorrect = useRef(false);

  // sessionStorage exists only in the browser, so it is read after mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCtx(readContext(topicParam)); }, [topicParam]);

  const fixed = fixedList !== null;
  const language = locale === 'en' ? 'en' : 'id';

  /** Starts the graph and the first question. Adaptive first, fixed-length list only if that fails. */
  async function start() {
    if (!ctx) return;
    setStartError(false);
    setMapDone(false);
    setStage('preparing');
    askedRef.current = [];
    try {
      const g = await post<{ nodes: CurriculumNode[]; edges: Graph['edges']; goal_node_id: string }>('/api/diagnostic/graph', {
        topic: ctx.topic, target_goal: ctx.goal, is_practitioner_track: ctx.practitioner, language,
      });
      setMapDone(true);
      const s = await post<{ adaptive_state: AdaptiveState; next: { nodeId: string; question: ApiQ } }>('/api/diagnostic/start', {
        topic: ctx.topic, target_goal: ctx.goal, nodes: g.nodes, edges: g.edges, goal_node_id: g.goal_node_id, language,
      });
      if (!s.adaptive_state || !s.next) throw new Error('no adaptive state');
      setGraph({ nodes: g.nodes, edges: g.edges, goalId: g.goal_node_id });
      setFixedList(null);
      adaptiveRef.current = s.adaptive_state;
      begin(toQ(s.next.question, s.next.nodeId, g.nodes));
    } catch (e) {
      console.warn('Adaptive pretest unavailable, using the fixed-length version', e);
      try {
        const s = await post<{ questions: { id: string; question: string; options: string[]; correct_index: number; explanation?: string; concept_tested: string; target_node_id: string }[] }>(
          '/api/diagnostic/start', { topic: ctx.topic, target_goal: ctx.goal, question_count: 5, is_practitioner_track: ctx.practitioner },
        );
        const list: Q[] = s.questions.map(q => ({
          id: q.id, question: q.question, options: q.options, correctIndex: q.correct_index,
          explanation: q.explanation, nodeId: q.target_node_id, label: q.concept_tested,
        }));
        if (list.length === 0) throw new Error('no questions');
        setGraph(null);
        setFixedList(list);
        adaptiveRef.current = null;
        begin(list[0]);
      } catch (err) {
        console.error('Could not load any question', err);
        setStartError(true);
        setStage('intro');
      }
    }
  }

  function begin(q: Q) {
    setCurrent(q);
    setNumber(1);
    setPicked(null);
    setNextDone(false);
    setNextError(false);
    setWaiting(false);
    pendingRef.current = null;
    setStage('quiz');
  }

  /** The next question is requested the moment an answer is given, so it is usually ready when the reader is. */
  const launchNext = useCallback((correct: boolean) => {
    if (!ctx || !graph || !adaptiveRef.current) return;
    lastCorrect.current = correct;
    setNextError(false);
    const p = post<NextRes>('/api/diagnostic/next', {
      adaptive_state: adaptiveRef.current, correct, nodes: graph.nodes, edges: graph.edges, topic: ctx.topic, language, max_questions: ctx.cap,
    });
    pendingRef.current = p;
    p.then(
      r => { if (pendingRef.current === p) setNextDone(r.done); },
      () => { if (pendingRef.current === p) setNextError(true); },
    );
  }, [ctx, graph, language]);

  const onPick = useCallback((i: number) => {
    if (picked !== null || !current) return;
    setPicked(i);
    askedRef.current = [...askedRef.current, { q: current, picked: i }];
    if (!fixed) launchNext(i === current.correctIndex);
  }, [picked, current, fixed, launchNext]);

  async function advance() {
    if (fixedList) {
      if (number >= fixedList.length) return finish();
      setCurrent(fixedList[number]);
      setNumber(number + 1);
      setPicked(null);
      return;
    }
    if (!pendingRef.current) return;
    setWaiting(true);
    try {
      const r = await pendingRef.current;
      adaptiveRef.current = r.adaptive_state;
      if (r.done || !r.next || !graph) return finish();
      setCurrent(toQ(r.next.question, r.next.nodeId, graph.nodes));
      setNumber(n => n + 1);
      setPicked(null);
      setNextDone(false);
      setWaiting(false);
    } catch {
      setNextError(true);
      setWaiting(false);
    }
  }

  function retryNext() {
    launchNext(lastCorrect.current);
    void advance();
  }

  async function finish() {
    if (!ctx) return;
    setWaiting(false);
    setSaveError(false);
    setStage('analyzing');
    const asked = askedRef.current;
    const state = adaptiveRef.current;
    try {
      const data = await post<{
        result: { graph_id?: string; total_questions: number; identified_gaps: { concept: string; justification: string }[] };
        graph: { nodes: CurriculumNode[]; edges: unknown[] };
        adaptive?: { startNodeId: string; gaps: { nodeId: string }[]; mastered: string[] };
      }>('/api/diagnostic/analyze', {
        topic: ctx.topic,
        target_goal: ctx.goal,
        is_practitioner_track: ctx.practitioner,
        intake_context: ctx.intake,
        answers: asked.map(({ q, picked: p }) => ({
          question_id: q.id, question: q.question, options: q.options, selected_option: p, confidence_level: 'medium',
          concept_tested: q.label, correct_index: q.correctIndex, explanation: q.explanation, target_node_id: q.nodeId,
        })),
        ...(state && graph ? { adaptive_state: state, graph: { nodes: graph.nodes, edges: graph.edges } } : {}),
      });
      sessionStorage.setItem('pijar_diagnostic_result', JSON.stringify(data.result));
      sessionStorage.setItem('pijar_generated_graph', JSON.stringify(data.graph));
      const gid = data.result.graph_id || '';
      document.cookie = `pijar_active_topic=${encodeURIComponent(ctx.topic)}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `pijar_active_graph_id=${encodeURIComponent(gid)}; path=/; max-age=604800; SameSite=Lax`;
      // Link the onboarding goal to the graph it produced. Non-blocking: a missing learning_goals table just means no history.
      const goalRow = sessionStorage.getItem('pijar_goal_id');
      if (goalRow && gid) {
        try {
          const { error } = await createClient().from('learning_goals').update({ graph_id: gid, node_id: data.adaptive?.startNodeId ?? null }).eq('id', goalRow);
          if (error && !isMissingGoalsTable(error)) console.warn('learning_goals', error.message);
        } catch { /* offline: the result is already saved */ }
      }

      const nodes = data.graph.nodes;
      const a = data.adaptive;
      setResult(a && state ? {
        answered: asked.length,
        startLabel: labelOf(nodes, a.startNodeId),
        gaps: a.gaps.map(g => ({
          id: g.nodeId,
          label: labelOf(nodes, g.nodeId),
          reason: t(`diagnostic.reason.${gapDetail(state.answers, g.nodeId)}`),
        })),
        mastered: a.mastered.map(id => ({ id, label: labelOf(nodes, id) })),
        graphId: gid || null,
      } : {
        answered: asked.length,
        startLabel: data.result.identified_gaps[0]?.concept ?? null,
        gaps: data.result.identified_gaps.map((g, i) => ({ id: String(i), label: g.concept, reason: g.justification })),
        mastered: [],
        graphId: gid || null,
      });
      setStage('result');
    } catch (e) {
      console.error('Saving the pretest result failed', e);
      setSaveError(true);
    }
  }

  function retake() {
    setResult(null);
    setCurrent(null);
    setStage('intro');
  }

  if (ctx === undefined) return <div className="mx-auto w-full max-w-2xl"><QuestionSkeleton /></div>;

  if (ctx === null) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('diagnostic.empty.title')}
        description={t('diagnostic.empty.desc')}
        action={<Button render={<Link href="/onboarding" />} nativeButton={false}>{t('diagnostic.empty.action')}</Button>}
      />
    );
  }

  if (stage === 'intro') {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-8 pt-4">
        <div className="pj-rise grid gap-3">
          <h1 className="font-display text-h3 font-semibold">{t('diagnostic.intro.title')}</h1>
          <p className="max-w-prose text-muted-foreground">{t('diagnostic.intro.lead')}</p>
        </div>

        <Card tone="raised" className="pj-rise overflow-hidden" style={{ '--pj-i': 1 } as React.CSSProperties}>
          <div className="h-1 w-full bg-amber" aria-hidden />
          <dl className="grid divide-y divide-hairline px-(--card-spacing) text-sm">
            <IntroRow k={t('diagnostic.intro.row.topic')} v={ctx.topic} />
            <IntroRow k={t('diagnostic.intro.row.length')} v={t('diagnostic.intro.row.length.value', { n: ctx.cap })} />
            <IntroRow k={t('diagnostic.intro.row.stakes')} v={t('diagnostic.intro.row.stakes.value')} />
          </dl>
        </Card>

        {ctx.intake?.empathy_mentor_note && (
          <figure className="pj-rise grid gap-1 pl-4" style={{ '--pj-i': 2, borderLeft: '2px solid var(--pj-hairline-strong)' } as React.CSSProperties}>
            <figcaption className="text-xs text-muted-foreground">{t('diagnostic.intro.note.title')}</figcaption>
            <blockquote className="text-sm">{ctx.intake.empathy_mentor_note}</blockquote>
          </figure>
        )}

        {startError && <p role="alert" className="text-sm">{t('diagnostic.error.start')}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={start}>{startError ? t('common.action.retry') : t('diagnostic.intro.start')}</Button>
          <Button size="lg" variant="ghost" render={<Link href="/dashboard" />} nativeButton={false}>{t('diagnostic.intro.back')}</Button>
        </div>
      </div>
    );
  }

  if (stage === 'preparing') {
    return (
      <GeneratingScreen
        title={t('common.generating.diagnostic.title')}
        stages={prepStages}
        stage={mapDone ? 2 : 0}
        ceil={mapDone ? 2 : 1}
        paceMs={6000}
        className="min-h-[calc(100dvh-16rem)]"
      />
    );
  }

  if (stage === 'analyzing') {
    return (
      <GeneratingScreen
        title={t('common.generating.save.title')}
        stages={saveStages}
        paceMs={4000}
        error={saveError}
        onRetry={finish}
        className="min-h-[calc(100dvh-16rem)]"
      />
    );
  }

  if (stage === 'result' && result) {
    return (
      <div className="grid gap-6">
        {fixed && <p className="text-sm text-muted-foreground">{t('diagnostic.fallback.note')}</p>}
        <ResultView r={result} onRetake={retake} />
      </div>
    );
  }

  if (stage === 'quiz' && current) {
    if (waiting) {
      return <GeneratingScreen title={t('diagnostic.waiting.title')} stages={nextStages} className="min-h-[calc(100dvh-16rem)]" />;
    }
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        {fixed && <p className="text-sm text-muted-foreground">{t('diagnostic.fallback.note')}</p>}
        <QuestionPanel
          q={current}
          number={number}
          max={fixed ? fixedList!.length : ctx.cap}
          fixed={fixed}
          picked={picked}
          onPick={onPick}
          onNext={advance}
          last={fixed ? number >= fixedList!.length : nextDone}
          error={nextError}
          onRetry={retryNext}
        />
      </div>
    );
  }

  return null;
}

function IntroRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}
