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
import { exprFromScript, fallbackBoardSpec } from '@/lib/learn/board-spec';
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

  const [fetched, setFetched] = useState<{ key: string; material?: DetailedLearningMaterial; failed?: boolean; notFound?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const [passedKey, setPassedKey] = useState('');

  // The stored topic is client-only; the server snapshot (null) keeps `ready` false until it resolves.
  const stored = useSyncExternalStore(subscribeNever, () => sessionStorage.getItem('pijar_topic') ?? '', () => null);
  const ready = stored !== null; // topic resolved, so the first fetch uses the right key
  const topic = searchParams.get('topic') || stored || 'dsa';
  const graph = useMemo(() => (ready ? getActiveGraph(topic) : null), [ready, topic]);
  const storedMastered = useMemo(() => ready && getMasteredNodes(topic).includes(nodeId), [ready, topic, nodeId]);
  const mastered = storedMastered || passedKey === `${topic}/${nodeId}`;

  const node = graph?.nodes.find(n => n.id === nodeId);

  // One generation per concept and language: the server caches it, so a visit never regenerates.
  const curated = locale === 'id' ? CURATED_MATERIALS[nodeId] : undefined;
  const key = `${topic}/${nodeId}/${graphId}/${locale}/${attempt}`;
  const current = fetched?.key === key ? fetched : undefined;
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
            topic, nodeId, graphId, language: locale,
            nodeLabel: node?.label, nodeCategory: node?.category, nodeDescription: node?.description,
          }),
        });
        const data = await res.json();
        if (data.code === 'NODE_NOT_FOUND') {
          if (live) setFetched({ key, failed: true, notFound: true });
          return;
        }
        if (!data.success || !data.material) throw new Error(data.error || 'material');
        if (live) setFetched({ key, material: data.material });
      } catch {
        if (live) setFetched({ key, failed: true });
      }
    })();
    return () => { live = false; };
    // node is read once for hints only; the cache key is topic + nodeId + language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, topic, nodeId, graphId, locale, attempt]);

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
    () => material?.interactiveBoard ?? (material ? fallbackBoardSpec(`${material.title} ${node?.label ?? ''} ${node?.description ?? ''}`, locale, exprFromScript(material.videoScript)) : null),
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
      <article id="lesson-top" className={`${frame} space-y-10 pt-10 pb-24`}>
        <header className="space-y-5">
          <h1 className="font-display text-h2 max-w-3xl"><MathText text={material.title} /></h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            {node?.category && <span>{node.category}</span>}
            {node?.category && <span aria-hidden>·</span>}
            <span>{level}</span>
            <span aria-hidden>·</span>
            <span>{t('learn.byline.minutes', { n: minutes })}</span>
            {mastered && <Badge variant="success">{t('learn.byline.mastered')}</Badge>}
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground"><MathText text={material.summary} /></p>
          <Button variant="secondary" render={<Link href={workspaceHref} />} nativeButton={false}>
            <PencilRuler strokeWidth={1.75} aria-hidden />
            {t('learn.action.workspace')}
          </Button>
        </header>

        <InteractiveVideoPlayer script={material.videoScript} />

        {board && (
          <section className="mx-auto w-full max-w-3xl space-y-4">
            <h2 className="font-display text-h3">{t('learn.board.title')}</h2>
            <InteractiveBoard spec={board} />
          </section>
        )}

        <div className="mx-auto max-w-2xl space-y-10">
          <div className="rounded-inner bg-surface p-5">
            <p className="text-sm font-medium">{t('learn.objective.label')}</p>
            <p className="mt-1 text-base leading-relaxed"><MathText text={material.learningObjective} /></p>
          </div>

          <Section title={t('learn.section.concept')}>
            <RichText text={material.conceptExplanation} />
          </Section>

          {material.analogy && (
            <Section title={t('learn.section.analogy')}>
              <p className="rounded-inner bg-surface p-5 text-base leading-[1.75]"><MathText text={material.analogy} /></p>
            </Section>
          )}

          {!!material.keyDefinitions?.length && (
            <Section title={t('learn.section.definitions')}>
              <dl className="divide-y divide-hairline rounded-inner border border-hairline">
                {material.keyDefinitions.map((d, i) => (
                  <div key={i} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                    <dt className="text-base font-medium"><MathText text={d.term} /></dt>
                    <dd className="text-base leading-relaxed text-muted-foreground"><MathText text={d.definition} /></dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {!!material.examples?.length && (
            <Section title={t('learn.section.examples')}>
              <div className="space-y-8">
                {material.examples.map((ex, i) => (
                  <div key={i} className="space-y-3">
                    <h3 className="font-display text-h4"><MathText text={ex.title} /></h3>
                    <CodeBlock code={ex.code} language={ex.language} />
                    {ex.output && <CodeBlock code={ex.output} language={t('learn.example.output')} />}
                    <p className="text-base leading-relaxed text-muted-foreground"><MathText text={ex.explanation} /></p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!!material.commonMisconceptions?.length && (
            <Section title={t('learn.section.misconceptions')}>
              <ul className="space-y-3">
                {material.commonMisconceptions.map((m, i) => (
                  <li key={i} className="space-y-3 rounded-inner border border-hairline p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('learn.misconception.wrong')}</p>
                      <p className="text-base leading-relaxed"><MathText text={m.misconception} /></p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('learn.misconception.right')}</p>
                      <p className="text-base leading-relaxed"><MathText text={m.correction} /></p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {material.realWorldApplication && (
            <Section title={t('learn.section.application')}>
              <p className="text-base leading-[1.75]"><MathText text={material.realWorldApplication} /></p>
            </Section>
          )}

          {!!material.keyTakeaways?.length && (
            <Section title={t('learn.section.takeaways')}>
              <ol className="list-decimal space-y-2 pl-6 text-base leading-relaxed marker:text-muted-foreground">
                {material.keyTakeaways.map((k, i) => <li key={i}><MathText text={k} /></li>)}
              </ol>
            </Section>
          )}
        </div>

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
      </article>

      <TutorChat nodeId={nodeId} title={material.title} topic={topic} />
    </Shell>
  );
}
