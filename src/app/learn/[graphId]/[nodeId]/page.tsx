'use client';

import React, { Suspense, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, PencilRuler } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GeneratingScreen, useStages } from '@/components/ui/generating-screen';
import { InteractiveVideoPlayer } from '@/components/learn/InteractiveVideoPlayer';
import { InteractiveBoard } from '@/components/learn/board/InteractiveBoard';
import { PostTest } from '@/components/learn/PostTest';
import { CodeBlock, RichText } from '@/components/learn/RichText';
import { TutorChat } from '@/components/learn/TutorChat';
import { useT } from '@/lib/i18n/client';
import { MathText } from '@/components/ui/math-text';
import { createClient } from '@/lib/supabase/client';
import { getActiveGraph, getMasteredNodes, markNodeMastered } from '@/lib/graph/storage';
import { CURATED_MATERIALS } from '@/lib/learn/curated-materials';
import { boardForLesson } from '@/lib/learn/board-spec';
import { countWords } from '@/lib/learn/markdown';
import type { DetailedLearningMaterial } from '@/lib/learn/types';

interface LearnPageProps {
  params: Promise<{ graphId: string; nodeId: string }>;
}

export default function LearnPage({ params }: LearnPageProps) {
  return (
    <Suspense fallback={<Shell><LessonGenerating /></Shell>}>
      <LearnContent params={params} />
    </Suspense>
  );
}

type ShellUser = { name?: string | null; email?: string | null };

/** Signed-in shell. The browser client supplies the user for the avatar. */
function Shell({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  const [user, setUser] = useState<ShellUser | undefined>();
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) setUser({ name: (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined), email: u.email });
    }).catch(() => {});
  }, []);
  return <AppShell user={user} title={title}>{children}</AppShell>;
}

const frame = 'mx-auto w-full max-w-4xl px-5 md:px-8';

/** The whole-page wait for a lesson that has to be written. One request does it all, so the stage pacing is cosmetic. */
function LessonGenerating({ error = false, onRetry }: { error?: boolean; onRetry?: () => void }) {
  const { t } = useT();
  const stages = useStages('lesson', ['gap', 'material', 'animation', 'quiz']);
  return (
    <GeneratingScreen
      title={t('common.generating.lesson.title')}
      stages={stages}
      paceMs={7000}
      hint={t('common.generating.hint.lesson')}
      error={error}
      onRetry={onRetry}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-hairline pt-8">
      <h2 className="font-display text-h3">{title}</h2>
      {children}
    </section>
  );
}

const subscribeNever = () => () => {};

function LearnContent({ params }: LearnPageProps) {
  const { graphId, nodeId } = use(params);
  const searchParams = useSearchParams();
  const { t, locale } = useT();

  const [fetched, setFetched] = useState<{ key: string; material?: DetailedLearningMaterial; topic?: string; failed?: boolean; notFound?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const [passedKey, setPassedKey] = useState('');

  // The stored topic is client-only; the server snapshot (null) keeps `ready` false until it resolves.
  const stored = useSyncExternalStore(subscribeNever, () => sessionStorage.getItem('pijar_topic') ?? '', () => null);
  const ready = stored !== null; // topic resolved, so the first fetch uses the right key
  // The first guess only names the request; the server answers with the graph's real topic, which wins from then on.
  const guess = searchParams.get('topic') || stored || 'dsa';
  const key = `${guess}/${nodeId}/${graphId}/${locale}/${attempt}`;
  const current = fetched?.key === key ? fetched : undefined;
  const topic = current?.topic || guess;
  const graph = useMemo(() => (ready ? getActiveGraph(topic) : null), [ready, topic]);
  const storedMastered = useMemo(() => ready && getMasteredNodes(topic).includes(nodeId), [ready, topic, nodeId]);
  const mastered = storedMastered || passedKey === `${topic}/${nodeId}`;

  const node = graph?.nodes.find(n => n.id === nodeId);

  // One generation per concept and language: the server caches it, so a visit never regenerates.
  const curated = locale === 'id' ? CURATED_MATERIALS[nodeId] : undefined;
  const material = curated ?? current?.material ?? null;
  const failed = !curated && Boolean(current?.failed);
  useEffect(() => {
    if (!ready || curated) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/learn/material', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: guess, nodeId, graphId, language: locale,
            nodeLabel: node?.label, nodeCategory: node?.category, nodeDescription: node?.description,
          }),
        });
        const data = await res.json();
        if (data.code === 'NODE_NOT_FOUND') {
          if (live) setFetched({ key, failed: true, notFound: true });
          return;
        }
        if (!data.success || !data.material) throw new Error(data.error || 'material');
        if (live) setFetched({ key, material: data.material, topic: data.topic });
      } catch {
        if (live) setFetched({ key, failed: true });
      }
    })();
    return () => { live = false; };
    // node is read once for hints only; the cache key is topic + nodeId + language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, guess, nodeId, graphId, locale, attempt]);

  const handlePassed = useCallback(() => {
    setPassedKey(`${topic}/${nodeId}`);
    markNodeMastered(topic, nodeId).catch(() => {});
  }, [topic, nodeId]);

  const enc = encodeURIComponent;
  const mapHref = `/graph/${enc(graphId)}`;
  const workspaceHref = `/workspace/${enc(graphId)}/${enc(nodeId)}?topic=${enc(topic)}`;

  const minutes = useMemo(() => {
    if (!material) return 1;
    const text = [
      material.conceptExplanation, material.analogy, material.realWorldApplication,
      ...(material.keyDefinitions ?? []).map(d => d.definition),
      ...(material.examples ?? []).map(e => e.explanation),
      ...(material.keyTakeaways ?? []),
    ].join(' ');
    return Math.max(1, Math.round(countWords(text) / 200));
  }, [material]);

  // The AI board, or a recipe picked by keyword for math lessons that came without one (older caches, curated lessons).
  const board = useMemo(
    () => (material ? boardForLesson(material, `${material.title} ${node?.label ?? ''} ${node?.description ?? ''}`, locale) : null),
    [material, node?.label, node?.description, locale],
  );

  const backLink = (
    <Link href={mapHref} className="pj-press -ml-2 inline-flex h-11 items-center gap-2 rounded-pill px-3 text-sm text-muted-foreground hover:bg-hover hover:text-foreground md:h-9">
      <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
      {t('learn.back.graph')}
    </Link>
  );

  if (failed && current?.notFound) {
    return (
      <Shell title={backLink}>
        <div className={`${frame} flex flex-col items-start gap-4 py-24`}>
          <h1 className="font-display text-h2">{t('learn.notFound.title')}</h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">{t('learn.notFound.body')}</p>
          <Button render={<Link href={mapHref} />} nativeButton={false}>{t('learn.back.graph')}</Button>
        </div>
      </Shell>
    );
  }

  if (failed) {
    return (
      <Shell title={backLink}>
        <LessonGenerating error onRetry={() => setAttempt(a => a + 1)} />
      </Shell>
    );
  }

  if (!material) return <Shell title={backLink}><LessonGenerating /></Shell>;

  const level = t(`learn.level.${material.targetLevel}` as 'learn.level.beginner');

  return (
    <Shell title={backLink}>
      <article id="lesson-top" className={`${frame} space-y-12 pt-8 pb-24`}>
        {/* Lesson Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {node?.category && (
              <Badge variant="outline" className="font-medium">
                {node.category}
              </Badge>
            )}
            <Badge variant="neutral" className="font-normal">
              {level}
            </Badge>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {t('learn.byline.minutes', { n: minutes })}
            </span>
            {mastered && (
              <Badge variant="success" className="ml-1">
                {t('learn.byline.mastered')}
              </Badge>
            )}
          </div>

          <h1 className="font-display text-h2 md:text-[40px] font-bold tracking-tight text-foreground max-w-3xl leading-[1.15]">
            <MathText text={material.title} />
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            <MathText text={material.summary} />
          </p>

          <div className="pt-2">
            <Button variant="secondary" render={<Link href={workspaceHref} />} nativeButton={false}>
              <PencilRuler strokeWidth={1.75} aria-hidden />
              {t('learn.action.workspace')}
            </Button>
          </div>
        </header>

        {/* Video Player */}
        <InteractiveVideoPlayer script={material.videoScript} />

        {/* Interactive Board */}
        {board && (
          <section className="mx-auto w-full max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-pill bg-amber" aria-hidden />
              <h2 className="font-display text-h3 font-semibold">{t('learn.board.title')}</h2>
            </div>
            <InteractiveBoard spec={board} />
          </section>
        )}

        {/* Content Body */}
        <div className="mx-auto max-w-2xl space-y-12">
          {/* Objective Callout Card */}
          <div className="relative overflow-hidden rounded-card border border-hairline bg-surface p-6">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('learn.objective.label')}
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed text-foreground">
              <MathText text={material.learningObjective} />
            </p>
          </div>

          {/* Main Concept Explanation */}
          <Section title={t('learn.section.concept')}>
            <RichText text={material.conceptExplanation} />
          </Section>

          {/* Analogy Card */}
          {material.analogy && (
            <Section title={t('learn.section.analogy')}>
              <div className="rounded-card border border-hairline bg-surface p-6">
                <p className="text-base leading-[1.8] text-foreground">
                  <MathText text={material.analogy} />
                </p>
              </div>
            </Section>
          )}

          {/* Key Definitions */}
          {!!material.keyDefinitions?.length && (
            <Section title={t('learn.section.definitions')}>
              <div className="grid gap-3">
                {material.keyDefinitions.map((d, i) => (
                  <div key={i} className="rounded-inner border border-hairline bg-surface p-4 transition-colors">
                    <dt className="font-display text-base font-semibold text-foreground">
                      <MathText text={d.term} />
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      <MathText text={d.definition} />
                    </dd>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Code Examples */}
          {!!material.examples?.length && (
            <Section title={t('learn.section.examples')}>
              <div className="space-y-8">
                {material.examples.map((ex, i) => (
                  <div key={i} className="space-y-3">
                    <h3 className="font-display text-h4 font-semibold text-foreground">
                      <MathText text={ex.title} />
                    </h3>
                    <CodeBlock code={ex.code} language={ex.language} />
                    {ex.output && <CodeBlock code={ex.output} language={t('learn.example.output')} />}
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <MathText text={ex.explanation} />
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Common Misconceptions */}
          {!!material.commonMisconceptions?.length && (
            <Section title={t('learn.section.misconceptions')}>
              <div className="space-y-4">
                {material.commonMisconceptions.map((m, i) => (
                  <div key={i} className="overflow-hidden rounded-card border border-hairline bg-surface">
                    {/* Misconception */}
                    <div className="border-b border-hairline p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="danger" className="text-xs">
                          {t('learn.misconception.wrong')}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <MathText text={m.misconception} />
                      </p>
                    </div>
                    {/* Correction */}
                    <div className="bg-raised p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="success" className="text-xs">
                          {t('learn.misconception.right')}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-foreground">
                        <MathText text={m.correction} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Real World Application */}
          {material.realWorldApplication && (
            <Section title={t('learn.section.application')}>
              <div className="rounded-card border border-hairline bg-surface p-6">
                <p className="text-base leading-[1.8] text-foreground">
                  <MathText text={material.realWorldApplication} />
                </p>
              </div>
            </Section>
          )}

          {/* Key Takeaways */}
          {!!material.keyTakeaways?.length && (
            <Section title={t('learn.section.takeaways')}>
              <div className="rounded-card border border-hairline bg-surface p-6">
                <ul className="space-y-3">
                  {material.keyTakeaways.map((k, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill bg-action text-xs font-semibold text-action-foreground tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-base leading-relaxed text-foreground">
                        <MathText text={k} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}
        </div>

        {/* Post Test / Kuis Evaluasi */}
        <div className="mx-auto max-w-2xl pt-6">
          <PostTest
            key={`${topic}:${nodeId}:${locale}`}
            topic={topic}
            nodeId={nodeId}
            graphId={graphId}
            label={material.title}
            graph={graph ? { nodes: graph.nodes, edges: graph.edges } : null}
            onPassed={handlePassed}
            mapHref={mapHref}
            nextHref={id => `/learn/${enc(graphId)}/${enc(id)}?topic=${enc(topic)}`}
          />
        </div>
      </article>

      <TutorChat nodeId={nodeId} title={material.title} topic={topic} />
    </Shell>
  );
}
