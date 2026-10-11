'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { CurriculumEdge } from '@/types';
import type { EnrichedConceptNode } from '@/lib/graph/types';
import { inspectPrerequisiteChain, recommendNextConcept } from '@/lib/graph/engine';
import { ConceptNodeComponent } from './ConceptNodeComponent';
import { GraphInspector } from './GraphInspector';
import { GraphControlsBar } from './GraphControlsBar';
import { GraphLegend } from './GraphLegend';

const nodeTypes = {
  conceptNode: ConceptNodeComponent,
};

interface CurriculumCanvasProps {
  initialNodes: EnrichedConceptNode[];
  initialEdges: CurriculumEdge[];
  topicName: string;
  graphId?: string;
}

export function CurriculumCanvas({
  initialNodes,
  initialEdges,
  topicName,
  graphId,
}: CurriculumCanvasProps) {
  return (
    <ReactFlowProvider>
      <CurriculumCanvasInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        topicName={topicName}
        graphId={graphId}
      />
    </ReactFlowProvider>
  );
}

function CurriculumCanvasInner({
  initialNodes,
  initialEdges,
  topicName,
  graphId,
}: CurriculumCanvasProps) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  // Selected node state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Highlighted prerequisite chain state
  const [highlightedChain, setHighlightedChain] = useState<Set<string> | null>(null);
  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'gaps' | 'ready'>('all');

  // Node Map lookup
  const allNodesMap = useMemo(() => {
    return new Map(initialNodes.map(n => [n.id, n]));
  }, [initialNodes]);

  // Compute recommendation
  const recommendation = useMemo(() => {
    return recommendNextConcept(initialNodes, initialEdges);
  }, [initialNodes, initialEdges]);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return allNodesMap.get(selectedNodeId) || null;
  }, [selectedNodeId, allNodesMap]);

  // Calculate chain info for selected node
  const chainInfo = useMemo(() => {
    if (!selectedNodeId) return null;
    return inspectPrerequisiteChain(selectedNodeId, initialNodes, initialEdges);
  }, [selectedNodeId, initialNodes, initialEdges]);

  // Focus a node on the canvas smoothly
  const handleFocusNode = useCallback((nodeId: string) => {
    const node = allNodesMap.get(nodeId);
    if (!node || node.x === undefined || node.y === undefined) return;

    // Node is ~250px wide and ~110px tall
    setCenter(node.x + 125, node.y + 55, {
      zoom: 1.15,
      duration: 800,
    });
  }, [allNodesMap, setCenter]);

  // Node selection handler
  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    handleFocusNode(nodeId);
  }, [handleFocusNode]);

  // Highlight prerequisite chain toggle
  const handleHighlightChain = useCallback((nodeId: string) => {
    if (highlightedChain) {
      setHighlightedChain(null);
      return;
    }

    const chain = inspectPrerequisiteChain(nodeId, initialNodes, initialEdges);
    const chainSet = new Set<string>([
      nodeId,
      ...chain.allAncestors,
      ...chain.unlockedDownstream,
    ]);
    setHighlightedChain(chainSet);
  }, [highlightedChain, initialNodes, initialEdges]);

  // Focus top recommended concept
  const handleFocusRecommendation = useCallback(() => {
    if (recommendation.recommendedNode) {
      setSelectedNodeId(recommendation.recommendedNode.id);
      handleFocusNode(recommendation.recommendedNode.id);
    }
  }, [recommendation, handleFocusNode]);

  // Build React Flow Nodes
  const rfNodes: Node[] = useMemo(() => {
    return initialNodes.map(n => {
      const isSelected = n.id === selectedNodeId;
      const isRecommended = recommendation.recommendedNode?.id === n.id;

      // Filtering logic
      let isDimmed = false;
      if (activeFilter === 'gaps' && n.status !== 'prerequisite_gap') {
        isDimmed = true;
      } else if (activeFilter === 'ready' && n.status !== 'ready' && n.status !== 'prerequisite_gap') {
        isDimmed = true;
      }

      // Path highlight dimming
      let isPathHighlighted = false;
      if (highlightedChain) {
        if (highlightedChain.has(n.id)) {
          isPathHighlighted = true;
        } else {
          isDimmed = true;
        }
      }

      return {
        id: n.id,
        type: 'conceptNode',
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: {
          node: n,
          isSelected,
          isDimmed,
          isPathHighlighted,
          isRecommendedTarget: isRecommended,
          onSelect: handleSelectNode,
        },
      };
    });
  }, [initialNodes, selectedNodeId, recommendation, activeFilter, highlightedChain, handleSelectNode]);

  // Build React Flow Edges
  const rfEdges: Edge[] = useMemo(() => {
    return initialEdges.map(e => {
      const isSourceSelected = e.source === selectedNodeId;
      const isTargetSelected = e.target === selectedNodeId;
      const isConnectedToSelected = isSourceSelected || isTargetSelected;

      let isPathActive = false;
      let isDimmed = false;

      if (highlightedChain) {
        if (highlightedChain.has(e.source) && highlightedChain.has(e.target)) {
          isPathActive = true;
        } else {
          isDimmed = true;
        }
      }

      const targetNode = allNodesMap.get(e.target);
      const isPrerequisiteGapTarget = targetNode?.status === 'prerequisite_gap';

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isConnectedToSelected || isPathActive || isPrerequisiteGapTarget,
        style: {
          stroke: isConnectedToSelected || isPathActive
            ? '#f59e0b' // Amber brand
            : isPrerequisiteGapTarget
            ? '#fb923c' // Warm coral
            : 'rgba(156, 163, 175, 0.4)',
          strokeWidth: isConnectedToSelected || isPathActive ? 2.5 : 1.75,
          opacity: isDimmed ? 0.15 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnectedToSelected || isPathActive
            ? '#f59e0b'
            : isPrerequisiteGapTarget
            ? '#fb923c'
            : 'rgba(156, 163, 175, 0.6)',
          width: 14,
          height: 14,
        },
        label: e.label,
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fill: '#6b7280',
        },
        labelBgStyle: {
          fill: 'var(--color-card, #ffffff)',
          fillOpacity: 0.85,
        },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
  }, [initialEdges, selectedNodeId, highlightedChain, allNodesMap]);

  // Internal node/edge state for dragging
  const [nodes, setNodes] = useState<Node[]>(rfNodes);
  const [edges, setEdges] = useState<Edge[]>(rfEdges);

  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Initial fit-view on mount
  const hasFitViewRef = useRef(false);
  useEffect(() => {
    if (!hasFitViewRef.current && nodes.length > 0) {
      hasFitViewRef.current = true;
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 600 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fitView, nodes]);

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-background">
      {/* ── Graph Workspace ───────────────────────────────────── */}
      <div className="relative flex-1 h-full min-h-[500px]">
        {/* Controls Bar (Zoom, Fit, Filter, Focus Recommendation) */}
        <GraphControlsBar
          onFitView={() => fitView({ padding: 0.2, duration: 500 })}
          onZoomIn={() => zoomIn({ duration: 300 })}
          onZoomOut={() => zoomOut({ duration: 300 })}
          onResetView={() => fitView({ padding: 0.25, duration: 500 })}
          onFocusRecommendation={handleFocusRecommendation}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          hasRecommendation={Boolean(recommendation.recommendedNode)}
        />

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setHighlightedChain(null);
          }}
          minZoom={0.3}
          maxZoom={1.8}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          proOptions={{ hideAttribution: true }}
          className="bg-dot-pattern select-none"
        >
          {/* Subtle Grid Background */}
          <Background
            gap={24}
            size={1.5}
            color="rgba(156, 163, 175, 0.2)"
          />

          {/* MiniMap */}
          <MiniMap
            nodeColor={(n) => {
              const nd = (n.data as unknown as { node?: EnrichedConceptNode })?.node;
              if (nd?.status === 'completed') return '#10b981';
              if (nd?.status === 'prerequisite_gap') return '#f59e0b';
              if (nd?.status === 'ready') return '#fbbf24';
              if (nd?.status === 'in_progress') return '#0284c7';
              return '#9ca3af';
            }}
            nodeStrokeWidth={2}
            zoomable
            pannable
            className="!hidden lg:!block !rounded-2xl !border !border-border/70 !bg-card/90 !shadow-lg !bottom-5 !right-5 !m-0"
            style={{ width: 140, height: 95 }}
          />
        </ReactFlow>

        {/* Legend */}
        <GraphLegend />
      </div>

      {/* ── Concept Inspector Panel (Desktop Sidebar / Mobile Overlay) */}
      {selectedNode && (
        <GraphInspector
          selectedNode={selectedNode}
          chainInfo={chainInfo}
          allNodesMap={allNodesMap}
          onClose={() => {
            setSelectedNodeId(null);
            setHighlightedChain(null);
          }}
          onSelectNode={handleSelectNode}
          onFocusNode={handleFocusNode}
          onHighlightChain={handleHighlightChain}
          isChainHighlighted={Boolean(highlightedChain)}
          graphId={graphId}
          topic={topicName}
        />
      )}
    </div>
  );
}
