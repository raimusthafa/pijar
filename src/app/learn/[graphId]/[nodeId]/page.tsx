'use client';

import React, { Suspense, use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, PencilRuler, WifiOff } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractiveVideoPlayer } from '@/components/learn/InteractiveVideoPlayer';
import { PostTest } from '@/components/learn/PostTest';
import { CodeBlock, RichText } from '@/components/learn/RichText';
import { TutorChat } from '@/components/learn/TutorChat';
import { useT } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';
import { getActiveGraph, getMasteredNodes, markNodeMastered } from '@/lib/graph/storage';
import { CURATED_MATERIALS } from '@/lib/learn/curated-materials';
import { countWords } from '@/lib/learn/markdown';
import type { DetailedLearningMaterial } from '@/lib/learn/types';

interface LearnPageProps {
  params: Promise<{ graphId: string; nodeId: string }>;
}

export default function LearnPage({ params }: LearnPageProps) {
  return (
    <Suspense fallback={<Shell><LessonSkeleton /></Shell>}>
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

function LessonSkeleton({ withNote = false }: { withNote?: boolean }) {
  const { t } = useT();
  return (
    <div className={`${frame} space-y-8 pt-10 pb-16`} aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-48" />
        {withNote && (
          <div role="status" className="max-w-xl space-y-1 pt-2">
            <p className="text-base font-medium">{t('learn.loading.title')}</p>
            <p className="text-sm text-muted-foreground">{t('learn.loading.body')}</p>
          </div>
        )}
      </div>
      <Skeleton className="h-[26rem] w-full rounded-card" />
      <div className="mx-auto max-w-2xl space-y-3">
        {[100, 92, 96, 70].map((w, i) => <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />)}
      </div>
    </div>
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

function LearnContent({ params }: LearnPageProps) {
  const { graphId, nodeId } = use(params);
  const searchParams = useSearchParams();
  const { t, locale } = useT();

  const [topic, setTopic] = useState('dsa');
  const [ready, setReady] = useState(false); // topic resolved, so the first fetch uses the right key
  const [graph, setGraph] = useState<ReturnType<typeof getActiveGraph>>(null);
  const [material, setMaterial] = useState<DetailedLearningMaterial | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mastered, setMastered] = useState(false);

  const paramTopic = searchParams.get('topic');
  useEffect(() => {
    const resolved = paramTopic || sessionStorage.getItem('pijar_topic') || 'dsa';
    setTopic(resolved);
    setGraph(getActiveGraph(resolved));
    setMastered(getMasteredNodes(resolved).includes(nodeId));
    setReady(true);
  }, [paramTopic, nodeId]);

  const node = graph?.nodes.find(n => n.id === nodeId);

  // One generation per concept and language: the server caches it, so a visit never regenerates.
  useEffect(() => {
    if (!ready) return;
    let live = true;
    setMaterial(null);
    setFailed(false);
    if (locale === 'id' && CURATED_MATERIALS[nodeId]) {
      setMaterial(CURATED_MATERIALS[nodeId]);
      return;
    }
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
        if (!data.success || !data.material) throw new Error(data.error || 'material');
        if (live) setMaterial(data.material);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => { live = false; };
    // node is read once for hints only; the cache key is topic + nodeId + language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, topic, nodeId, graphId, locale, attempt]);

  const handlePassed = useCallback(() => {
    setMastered(true);
    markNodeMastered(topic, nodeId).catch(() => {});
  }, [topic, nodeId]);

  const enc = encodeURIComponent;
  const mapHref = `/graph?id=${enc(graphId)}&topic=${enc(topic)}`;
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

  const backLink = (
    <Link href={mapHref} className="pj-press -ml-2 inline-flex h-11 items-center gap-2 rounded-pill px-3 text-sm text-muted-foreground hover:bg-hover hover:text-foreground md:h-9">
      <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
      {t('learn.back.graph')}
    </Link>
  );

  if (failed) {
    return (
      <Shell title={backLink}>
        <EmptyState
          className="py-24"
          icon={WifiOff}
          title={t('learn.error.title')}
          description={t('learn.error.body')}
          action={<Button onClick={() => setAttempt(a => a + 1)}>{t('common.action.retry')}</Button>}
        />
      </Shell>
    );
  }

  if (!material) {
    return <Shell title={backLink}><LessonSkeleton withNote /></Shell>;
  }

  const level = t(`learn.level.${material.targetLevel}` as 'learn.level.beginner');

  return (
    <Shell title={backLink}>
      <article id="lesson-top" className={`${frame} space-y-10 pt-10 pb-24`}>
        <header className="space-y-5">
          <h1 className="font-display text-h2 max-w-3xl">{material.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            {node?.category && <span>{node.category}</span>}
            {node?.category && <span aria-hidden>·</span>}
            <span>{level}</span>
            <span aria-hidden>·</span>
            <span>{t('learn.byline.minutes', { n: minutes })}</span>
            {mastered && <Badge variant="success">{t('learn.byline.mastered')}</Badge>}
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{material.summary}</p>
          <Button variant="secondary" render={<Link href={workspaceHref} />} nativeButton={false}>
            <PencilRuler strokeWidth={1.75} aria-hidden />
            {t('learn.action.workspace')}
          </Button>
        </header>

        <InteractiveVideoPlayer script={material.videoScript} />

        <div className="mx-auto max-w-2xl space-y-10">
          <div className="rounded-inner bg-surface p-5">
            <p className="text-sm font-medium">{t('learn.objective.label')}</p>
            <p className="mt-1 text-base leading-relaxed">{material.learningObjective}</p>
          </div>

          <Section title={t('learn.section.concept')}>
            <RichText text={material.conceptExplanation} />
          </Section>

          {material.analogy && (
            <Section title={t('learn.section.analogy')}>
              <p className="rounded-inner bg-surface p-5 text-base leading-[1.75]">{material.analogy}</p>
            </Section>
          )}

          {!!material.keyDefinitions?.length && (
            <Section title={t('learn.section.definitions')}>
              <dl className="divide-y divide-hairline rounded-inner border border-hairline">
                {material.keyDefinitions.map((d, i) => (
                  <div key={i} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                    <dt className="text-base font-medium">{d.term}</dt>
                    <dd className="text-base leading-relaxed text-muted-foreground">{d.definition}</dd>
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
                    <h3 className="font-display text-h4">{ex.title}</h3>
                    <CodeBlock code={ex.code} language={ex.language} />
                    {ex.output && <CodeBlock code={ex.output} language={t('learn.example.output')} />}
                    <p className="text-base leading-relaxed text-muted-foreground">{ex.explanation}</p>
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
                      <p className="text-base leading-relaxed">{m.misconception}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('learn.misconception.right')}</p>
                      <p className="text-base leading-relaxed">{m.correction}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {material.realWorldApplication && (
            <Section title={t('learn.section.application')}>
              <p className="text-base leading-[1.75]">{material.realWorldApplication}</p>
            </Section>
          )}

          {!!material.keyTakeaways?.length && (
            <Section title={t('learn.section.takeaways')}>
              <ol className="list-decimal space-y-2 pl-6 text-base leading-relaxed marker:text-muted-foreground">
                {material.keyTakeaways.map((k, i) => <li key={i}>{k}</li>)}
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
