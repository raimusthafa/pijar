'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MarkerType,
  useReactFlow,
  BezierEdge,
  type Edge,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, List as ListIcon, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildAdjacencyMaps, recommendNextConcept } from '@/lib/graph/engine';
import { calculateHierarchicalLayout } from '@/lib/graph/layout';
import { prerequisitesWithin } from '@/lib/graph/prereq';
import type { EnrichedConceptNode } from '@/lib/graph/types';
import { useT } from '@/lib/i18n/client';
import type { CurriculumEdge, CurriculumNode } from '@/types';
import { ConceptNodeComponent, type ConceptFlowNode } from './ConceptNodeComponent';
import { GraphFilterBar, GraphZoomBar, type GraphFilter } from './GraphControlsBar';
import { GraphInspector } from './GraphInspector';
import { GraphLegend } from './GraphLegend';
import { OutlineView, type OutlineGroup } from './OutlineView';

const NODE_W = 264;
const NODE_H = 168;
const LAYOUT = { nodeWidth: NODE_W, nodeHeight: NODE_H, rankSpacing: 120, nodeSpacing: 40, startX: 40, startY: 40 };
const nodeTypes = { conceptNode: ConceptNodeComponent };
const edgeTypes = { bezier: BezierEdge };
const PANEL = 376; // inspector width plus its margin on desktop

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dur = (ms: number) => (reduced() ? 0 : ms);
const isDesktop = () => window.innerWidth >= 768;

type Placed = EnrichedConceptNode & { x: number; y: number };

export function GraphWorkspaceSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <div className="flex items-center gap-4 px-5 py-3 md:px-6">
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="min-h-0 flex-1 px-3 pb-3">
        <Skeleton className="h-full min-h-80 w-full rounded-inner" />
      </div>
    </div>
  );
}

export function GraphWorkspace({ graphId, topic, nodes, edges }: { graphId: string; topic: string; nodes: CurriculumNode[]; edges: CurriculumEdge[] }) {
  const { t } = useT();
  const placed = useMemo(() => calculateHierarchicalLayout(nodes, edges, LAYOUT) as Placed[], [nodes, edges]);
  const byId = useMemo(() => new Map<string, EnrichedConceptNode>(placed.map((n) => [n.id, n])), [placed]);
  const prereqs = useMemo(() => buildAdjacencyMaps(nodes, edges).prerequisitesMap, [nodes, edges]);
  const groups = useMemo<OutlineGroup[]>(() => {
    const xs = [...new Set(placed.map((n) => n.x))].sort((a, b) => a - b);
    return xs.map((x, level) => ({ level, nodes: placed.filter((n) => n.x === x).sort((a, b) => a.y - b.y) }));
  }, [placed]);

  const [view, setView] = useState<'map' | 'list' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const viaKeyboard = useRef(false);
  const panelRef = useRef<HTMLElement>(null);

  // Phones get the outline first: a canvas is a poor fit for a thumb.
  useEffect(() => {
    const id = requestAnimationFrame(() => setView(isDesktop() ? 'map' : 'list'));
    return () => cancelAnimationFrame(id);
  }, []);

  const select = useCallback((id: string, kb = false) => {
    viaKeyboard.current = kb;
    setSelectedId(id);
    setShownId(id);
  }, []);

  useEffect(() => {
    if (selectedId && viaKeyboard.current) panelRef.current?.focus();
  }, [selectedId]);

  const close = useCallback(() => {
    setSelectedId(null);
    // The panel turns inert while it holds focus, and the browser moves focus to the page after that. Waiting a beat lets the concept take it back.
    if (viaKeyboard.current && shownId) setTimeout(() => document.getElementById(`gnode-${shownId}`)?.focus(), 60);
  }, [shownId]);

  const done = placed.filter((n) => n.status === 'completed').length;
  const pct = placed.length ? Math.round((done / placed.length) * 100) : 0;

  return (
    <div
      className="relative flex h-full min-h-[28rem] flex-col"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && selectedId) close();
      }}
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 md:px-6">
        <Button variant="ghost" size="sm" render={<Link href="/graph" />} nativeButton={false} className="-ml-2">
          <ArrowLeft strokeWidth={1.75} aria-hidden />
          {t('graph.back')}
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-display text-h4 font-semibold">{topic}</h1>
        <div className="flex items-center gap-3 max-sm:order-2 max-sm:min-w-0 max-sm:flex-1 max-sm:justify-end">
          <Progress value={pct} aria-label={t('graph.map.progress', { done, total: placed.length })} className="w-28 flex-none max-sm:hidden" />
          <span className="text-sm text-muted-foreground tabular-nums max-sm:text-right max-sm:text-xs">{t('graph.map.progress', { done, total: placed.length })}</span>
        </div>
        <Tabs value={view ?? 'map'} onValueChange={(v) => setView(v as 'map' | 'list')} className="max-sm:order-1">
          <TabsList aria-label={t('graph.view.label')}>
            <TabsTrigger value="map"><Network strokeWidth={1.75} aria-hidden />{t('graph.view.map')}</TabsTrigger>
            <TabsTrigger value="list"><ListIcon strokeWidth={1.75} aria-hidden />{t('graph.view.list')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {view === null && <Skeleton className="m-3 h-[calc(100%-1.5rem)] rounded-inner" aria-hidden />}
        {view === 'map' && (
          <ReactFlowProvider>
            <MapCanvas placed={placed} edges={edges} selectedId={selectedId} onSelect={select} onClear={close} />
          </ReactFlowProvider>
        )}
        {view === 'list' && (
          <OutlineView groups={groups} selectedId={selectedId} onSelect={select} prereqs={prereqs} padBottom={Boolean(selectedId)} />
        )}
        <GraphInspector
          ref={panelRef}
          node={shownId ? (byId.get(shownId) ?? null) : null}
          open={Boolean(selectedId)}
          nodes={byId}
          edges={edges}
          graphId={graphId}
          topic={topic}
          onClose={close}
          onSelect={select}
        />
      </div>
    </div>
  );
}

function MapCanvas({
  placed,
  edges,
  selectedId,
  onSelect,
  onClear,
}: {
  placed: Placed[];
  edges: CurriculumEdge[];
  selectedId: string | null;
  onSelect: (id: string, kb?: boolean) => void;
  onClear: () => void;
}) {
  const { t } = useT();
  const { fitView, zoomIn, zoomOut, setCenter, getZoom, flowToScreenPosition } = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<GraphFilter>('all');
  const [roving, setRoving] = useState<string | null>(placed[0]?.id ?? null);
  const posOf = useMemo(() => new Map(placed.map((n) => [n.id, n])), [placed]);
  const recommended = useMemo(() => recommendNextConcept(placed, edges).recommendedNode, [placed, edges]);
  const path = useMemo(() => (selectedId ? prerequisitesWithin(selectedId, edges) : null), [selectedId, edges]);

  const pick = useCallback((id: string, kb = false) => {
    setRoving(id);
    onSelect(id, kb);
  }, [onSelect]);

  // Arrow keys jump to the nearest concept in that direction.
  const onArrow = useCallback((id: string, key: string) => {
    const from = posOf.get(id);
    if (!from) return;
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
    if (!dir) return;
    let best: { id: string; score: number } | null = null;
    for (const n of placed) {
      if (n.id === id) continue;
      const dx = n.x - from.x, dy = n.y - from.y;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 0) continue;
      const score = along + 2 * Math.abs(dx * dir[1] + dy * dir[0]);
      if (!best || score < best.score) best = { id: n.id, score };
    }
    if (best) {
      setRoving(best.id);
      document.getElementById(`gnode-${best.id}`)?.focus();
    }
  }, [placed, posOf]);

  // Keep the selected concept and its prerequisite path clear of the inspector, panning only when part of it would be hidden.
  useEffect(() => {
    const el = wrapRef.current;
    const ids = selectedId ? [selectedId, ...(path?.level.keys() ?? [])] : [];
    const boxes = ids.map((id) => posOf.get(id)).filter((n): n is Placed => Boolean(n));
    if (!boxes.length || !el) return;
    const x0 = Math.min(...boxes.map((n) => n.x)), x1 = Math.max(...boxes.map((n) => n.x)) + NODE_W;
    const y0 = Math.min(...boxes.map((n) => n.y)), y1 = Math.max(...boxes.map((n) => n.y)) + NODE_H;
    const r = el.getBoundingClientRect();
    const desktop = isDesktop();
    const z = getZoom();
    const tl = flowToScreenPosition({ x: x0, y: y0 });
    const fits =
      tl.x >= r.left + 16 &&
      tl.x + (x1 - x0) * z <= r.right - 16 - (desktop ? PANEL : 0) &&
      tl.y >= r.top + 56 &&
      tl.y + (y1 - y0) * z <= r.bottom - 16 - (desktop ? 0 : r.height * 0.78);
    if (fits) return;
    setCenter((x0 + x1) / 2 + (desktop ? PANEL / 2 / z : 0), (y0 + y1) / 2 + (desktop ? 0 : (r.height * 0.39) / z), { zoom: z, duration: dur(350) });
  }, [selectedId, path, posOf, getZoom, flowToScreenPosition, setCenter]);

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const onNodesChange: OnNodesChange<ConceptFlowNode> = useCallback((changes) => {
    setNodePositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of changes) {
        if (c.type === 'position' && c.position) {
          next[c.id] = c.position;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const nodes = useMemo<ConceptFlowNode[]>(() => placed.map((n) => {
    const onPath = Boolean(path?.level.has(n.id));
    const isRecommended = recommended?.id === n.id;
    const matches = filter === 'all' || n.status === 'prerequisite_gap' || (filter === 'ready' && n.status === 'ready');
    const pos = nodePositions[n.id] ?? { x: n.x, y: n.y };
    return {
      id: n.id,
      type: 'conceptNode',
      position: pos,
      data: {
        node: n,
        selected: n.id === selectedId,
        onPath,
        dimmed: !matches || Boolean(selectedId && n.id !== selectedId && !onPath),
        tabbable: n.id === roving,
        isRecommended,
        onSelect: pick,
        onArrow,
      },
    };
  }), [placed, path, filter, selectedId, roving, recommended, pick, onArrow, nodePositions]);

  const rfEdges = useMemo<Edge[]>(() => edges.map((e) => {
    const isSourceSelected = e.source === selectedId;
    const isTargetSelected = e.target === selectedId;
    const isConnectedToSelected = isSourceSelected || isTargetSelected;
    const isPathActive = Boolean(path?.edgeIds.has(e.id));
    const active = isConnectedToSelected || isPathActive;
    const shouldAnimate = isConnectedToSelected && !reduced();

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'bezier',
      animated: shouldAnimate,
      style: {
        stroke: active ? 'var(--pj-amber)' : 'var(--pj-ink)',
        strokeWidth: active ? 2.5 : 1.75,
        opacity: active ? 1 : selectedId ? 0.15 : 0.3,
        strokeDasharray: shouldAnimate ? '5 5' : undefined,
        transition: 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), stroke 200ms ease',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: active ? 'var(--pj-amber)' : 'var(--pj-ink)',
      },
    };
  }), [edges, path, selectedId]);

  const fit = useCallback(() => fitView({ padding: 0.2, maxZoom: 1.25, duration: dur(300) }), [fitView]);

  return (
    <div ref={wrapRef} role="group" aria-label={t('graph.canvas.label')} className="relative h-full">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.25 }}
        minZoom={0.15}
        maxZoom={1.6}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        nodesFocusable={false}
        edgesFocusable={false}
        onNodesChange={onNodesChange}
        onPaneClick={onClear}
        proOptions={{ hideAttribution: true }}
        className="bg-background!"
      />
      <GraphFilterBar
        filter={filter}
        onFilter={setFilter}
        hasNext={Boolean(recommended)}
        onNext={() => recommended && pick(recommended.id)}
      />
      <div className="absolute bottom-3 left-3 z-10 flex items-end gap-3">
        <GraphZoomBar onZoomIn={() => zoomIn({ duration: dur(200) })} onZoomOut={() => zoomOut({ duration: dur(200) })} onFit={fit} />
        <GraphLegend />
      </div>
    </div>
  );
}
