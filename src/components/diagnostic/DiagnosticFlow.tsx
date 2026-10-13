'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/lib/i18n/client';
import { MAX_QUESTIONS, type AdaptiveState } from '@/lib/diagnostic/adaptive';
import { gapDetail } from '@/lib/diagnostic/adaptive-graph';
import type { CognitiveIntakeResult, CurriculumNode } from '@/types';
import { QuestionPanel } from './QuestionPanel';
import { QuestionSkeleton } from './Skeletons';
import { ResultView } from './ResultView';
import type { Graph, Q, ResultData } from './types';

type Stage = 'intro' | 'preparing' | 'quiz' | 'analyzing' | 'result';
interface Ctx { topic: string; goal: string; practitioner: boolean; intake: CognitiveIntakeResult | null }
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
  };
}

export function DiagnosticFlow({ topicParam }: { topicParam?: string }) {
  const { t, locale } = useT();
  const [ctx, setCtx] = useState<Ctx | null | undefined>(undefined); // undefined: not read yet
  const [stage, setStage] = useState<Stage>('intro');
  const [startError, setStartError] = useState(false);
  const [saveError, setSaveError] = useState(false);

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
    setStage('preparing');
    askedRef.current = [];
    try {
      const g = await post<{ nodes: CurriculumNode[]; edges: Graph['edges']; goal_node_id: string }>('/api/diagnostic/graph', {
        topic: ctx.topic, target_goal: ctx.goal, is_practitioner_track: ctx.practitioner, language,
      });
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
      adaptive_state: adaptiveRef.current, correct, nodes: graph.nodes, edges: graph.edges, topic: ctx.topic, language,
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
          <h1 className="font-display text-h2 font-semibold">{t('diagnostic.intro.title')}</h1>
          <p className="max-w-prose text-muted-foreground">{t('diagnostic.intro.lead')}</p>
        </div>

        <Card tone="raised" className="pj-rise" style={{ '--pj-i': 1 } as React.CSSProperties}>
          <dl className="grid gap-4 px-(--card-spacing) text-sm">
            <IntroRow k={t('diagnostic.intro.row.topic')} v={ctx.topic} />
            <IntroRow k={t('diagnostic.intro.row.length')} v={t('diagnostic.intro.row.length.value')} />
            <IntroRow k={t('diagnostic.intro.row.stakes')} v={t('diagnostic.intro.row.stakes.value')} />
          </dl>
        </Card>

        {ctx.intake?.empathy_mentor_note && (
          <figure className="pj-rise grid gap-1 border-l border-hairline-strong pl-4" style={{ '--pj-i': 2 } as React.CSSProperties}>
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
    return <div className="mx-auto w-full max-w-2xl"><QuestionSkeleton title={t('diagnostic.preparing.title')} desc={t('diagnostic.preparing.desc')} /></div>;
  }

  if (stage === 'analyzing') {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <QuestionSkeleton title={t('diagnostic.analyzing.title')} desc={t('diagnostic.analyzing.desc')} />
        {saveError && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <p>{t('diagnostic.save.error')}</p>
            <Button variant="secondary" onClick={finish}>{t('diagnostic.save.retry')}</Button>
          </div>
        )}
      </div>
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
      return <div className="mx-auto w-full max-w-2xl"><QuestionSkeleton title={t('diagnostic.waiting.title')} /></div>;
    }
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        {fixed && <p className="text-sm text-muted-foreground">{t('diagnostic.fallback.note')}</p>}
        <QuestionPanel
          q={current}
          number={number}
          max={fixed ? fixedList!.length : MAX_QUESTIONS}
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
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
