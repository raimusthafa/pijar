'use client';

import React from 'react';
import type { VisualSceneType, VisualSceneState } from '@/lib/learn/types';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { MathVisual } from './MathVisual';

interface SceneVisualRendererProps {
  type: VisualSceneType;
  state: VisualSceneState;
  title?: string;
  /** 0..1 progress through the current scene (1 = final frame). */
  progress?: number;
  /** Dragging allowed (player paused or finished). */
  interactive?: boolean;
}

export function SceneVisualRenderer({ type, state, title, progress = 1, interactive = false }: SceneVisualRendererProps) {
  switch (type) {
    case 'call-stack':
      if (state.stackItems?.length) return <CallStackVisual state={state} />;
      break;
    case 'loss-landscape':
      return <LossLandscapeVisual state={state} />;
    case 'tree-structure':
      if (state.treeNodes?.length) return <TreeStructureVisual state={state} />;
      break;
    case 'code-execution':
      if (state.variables || state.currentStep || state.highlightedLine) return <CodeExecutionVisual state={state} />;
      break;
    case 'data-flow':
      if (state.flowStages?.length) return <DataFlowVisual state={state} />;
      break;
    case 'math-visualization':
      if (state.math) return <MathVisual spec={state.math} progress={progress} interactive={interactive} />;
      break;
  }
  // No usable data for the requested visual: show the concept overview instead of invented sample data.
  return <ConceptIllustrationVisual state={state} title={title} />;
}

// Shared flat frame: hairline border on a raised tone, header row with label and a plain tag.
function Frame({ label, meta, notes, children }: { label: string; meta?: React.ReactNode; notes?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[260px] w-full flex-col gap-4 rounded-inner border border-hairline bg-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-hairline pb-3">
        <span className="shrink-0 text-sm font-medium text-foreground">{label}</span>
        {meta && <Badge variant="outline" className="max-w-full"><span className="block truncate">{meta}</span></Badge>}
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
      {notes && <p className="rounded-control bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground">{notes}</p>}
    </div>
  );
}

// Amber is the one highlight; everything else sits on surface with a hairline.
const cell = 'rounded-control border px-3 py-2 font-mono text-xs';
const cellOn = 'border-transparent bg-amber text-amber-foreground';
const cellOff = 'border-hairline bg-surface text-foreground';

// ── 1. Call stack ─────────────────────────────────────────────────
function CallStackVisual({ state }: { state: VisualSceneState }) {
  const { t } = useT();
  const items = state.stackItems ?? [];
  return (
    <Frame label={t('learn.visual.callstack.title')} meta={t('learn.visual.callstack.meta', { n: items.length })} notes={state.notes}>
      <ol className="flex flex-col-reverse gap-2">
        {items.map((item, idx) => (
          <li
            key={idx}
            className={cn(cell, 'flex items-center justify-between gap-3', idx === 0 ? cellOn : cellOff)}
          >
            <span className="font-medium">{item.label}</span>
            <span className="flex items-center gap-2">
              <span className={idx === 0 ? '' : 'text-muted-foreground'}>{item.value}</span>
              {item.isBaseCase && <Badge variant="success">{t('learn.visual.callstack.basecase')}</Badge>}
            </span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

// ── 2. Loss landscape ─────────────────────────────────────────────
// The curve is the quadratic Bezier M10 15 Q100 175 190 15, so a point at fraction u sits at y = 15 + 320u(1-u).
function LossLandscapeVisual({ state }: { state: VisualSceneState }) {
  const { t } = useT();
  const point = state.lossPoint ?? { x: 50, y: 15, loss: 1.25, step: 5 };
  const u = Math.min(1, Math.max(0, point.x / 100));
  const cx = 10 + 180 * u;
  const cy = 15 + 320 * u * (1 - u);
  return (
    <Frame
      label={t('learn.visual.loss.title')}
      meta={t('learn.visual.loss.meta', { loss: point.loss.toFixed(2), step: point.step })}
      notes={state.notes || t('learn.visual.loss.fallback')}
    >
      <svg viewBox="0 0 200 118" className="mx-auto h-40 w-full max-w-md" role="img" aria-label={t('learn.visual.loss.title')}>
        <path d="M 10 15 Q 100 175 190 15" className="fill-none stroke-foreground" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="108" x2="190" y2="108" className="stroke-hairline-strong" strokeWidth="1" />
        <circle cx="100" cy="95" r="3.5" className="fill-foreground" />
        <text x="100" y="116" textAnchor="middle" className="fill-muted-foreground" fontSize="8">
          {t('learn.visual.loss.min')}
        </text>
        <circle cx={cx} cy={cy} r="6" className="fill-amber stroke-foreground" strokeWidth="1.5" />
      </svg>
      <p className="mt-2 text-center font-mono text-xs text-muted-foreground">{t('learn.visual.loss.rule')}</p>
    </Frame>
  );
}

// ── 3. Tree ───────────────────────────────────────────────────────
type TreeNode = NonNullable<VisualSceneState['treeNodes']>[number];

function TreeLevel({ node, byId, on, depth }: { node: TreeNode; byId: Map<string, TreeNode>; on: Set<string>; depth: number }) {
  const kids = depth < 6 ? (node.children ?? []).map(id => byId.get(id)).filter((n): n is TreeNode => !!n) : [];
  const active = node.isHighlighted || on.has(node.id);
  return (
    <li className="flex flex-col items-center gap-2">
      <span className={cn(cell, active ? cellOn : cellOff)}>{node.label}</span>
      {kids.length > 0 && (
        <>
          <span className="h-3 w-px bg-hairline-strong" aria-hidden />
          <ul className="flex flex-wrap items-start justify-center gap-4">
            {kids.map(k => <TreeLevel key={k.id} node={k} byId={byId} on={on} depth={depth + 1} />)}
          </ul>
        </>
      )}
    </li>
  );
}

function TreeStructureVisual({ state }: { state: VisualSceneState }) {
  const { t } = useT();
  const nodes = state.treeNodes ?? [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const childIds = new Set(nodes.flatMap(n => n.children ?? []));
  const roots = nodes.filter(n => !childIds.has(n.id));
  const on = new Set(state.activeNodes ?? []);
  return (
    <Frame label={t('learn.visual.tree.title')} meta={t('learn.visual.tree.meta', { n: nodes.length })} notes={state.notes}>
      <ul className="flex flex-wrap items-start justify-center gap-6">
        {(roots.length ? roots : nodes.slice(0, 1)).map(r => <TreeLevel key={r.id} node={r} byId={byId} on={on} depth={0} />)}
      </ul>
    </Frame>
  );
}

// ── 4. Code execution: steps and variables only, no invented source code ──
function CodeExecutionVisual({ state }: { state: VisualSceneState }) {
  const { t } = useT();
  const total = Math.max(1, state.totalSteps ?? state.currentStep ?? 1);
  const step = Math.min(total, Math.max(1, state.currentStep ?? 1));
  const vars = Object.entries(state.variables ?? {});
  return (
    <Frame
      label={t('learn.visual.code.title')}
      meta={state.highlightedLine ? t('learn.visual.code.line', { n: state.highlightedLine }) : undefined}
      notes={state.notes}
    >
      <p className="mb-2 text-xs text-muted-foreground">{t('learn.visual.code.step', { n: step, total })}</p>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-pill', i < step ? 'bg-amber' : 'bg-surface-strong')} />
        ))}
      </div>
      {vars.length > 0 && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-control border border-hairline bg-surface p-3 font-mono text-xs">
          <dt className="col-span-2 font-sans text-xs text-muted-foreground">{t('learn.visual.code.vars')}</dt>
          {vars.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-foreground">{String(v)}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </Frame>
  );
}

// ── 5. Data flow ──────────────────────────────────────────────────
function DataFlowVisual({ state }: { state: VisualSceneState }) {
  const { t } = useT();
  const stages = state.flowStages ?? [];
  return (
    <Frame label={t('learn.visual.flow.title')} notes={state.notes}>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {stages.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-stretch gap-2 sm:flex-col">
            <div className={cn(cell, 'flex flex-1 flex-col gap-1 text-center', s.status === 'active' ? cellOn : cellOff)}>
              <span className="font-medium">{s.label}</span>
              <span className={cn('font-sans text-[11px]', s.status === 'active' ? '' : 'text-muted-foreground')}>
                {t(`learn.visual.flow.${s.status}` as 'learn.visual.flow.done')}
              </span>
            </div>
            {i < stages.length - 1 && <span className="hidden h-px w-full bg-hairline-strong sm:block" aria-hidden />}
          </li>
        ))}
      </ol>
    </Frame>
  );
}

// ── 6. Concept overview ───────────────────────────────────────────
function ConceptIllustrationVisual({ state, title }: { state: VisualSceneState; title?: string }) {
  const { t } = useT();
  const nodes = state.activeNodes ?? [];
  return (
    <Frame label={t('learn.visual.concept.title')} meta={title} notes={nodes.length ? state.notes : undefined}>
      {nodes.length > 0 ? (
        <ol className="flex flex-wrap justify-center gap-2">
          {nodes.map((n, i) => (
            <li key={i} className={cn(cell, 'flex items-center gap-2 font-sans text-sm', i === 0 ? cellOn : cellOff)}>
              <span className="font-mono text-xs">{i + 1}</span>
              {n}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-center text-base leading-relaxed text-foreground">{state.notes}</p>
      )}
    </Frame>
  );
}
