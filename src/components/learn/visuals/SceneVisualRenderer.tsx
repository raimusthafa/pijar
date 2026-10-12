'use client';

import React from 'react';
import type { VisualSceneType, VisualSceneState } from '@/lib/learn/types';
import { Layers, Sparkles, TrendingDown, GitFork, Terminal, Cpu, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SceneVisualRendererProps {
  type: VisualSceneType;
  state: VisualSceneState;
  title?: string;
}

export function SceneVisualRenderer({ type, state, title }: SceneVisualRendererProps) {
  switch (type) {
    case 'call-stack':
      return <CallStackVisual state={state} />;
    case 'loss-landscape':
      return <LossLandscapeVisual state={state} />;
    case 'tree-structure':
      return <TreeStructureVisual state={state} />;
    case 'code-execution':
      return <CodeExecutionVisual state={state} />;
    case 'data-flow':
      return <DataFlowVisual state={state} />;
    case 'math-visualization':
    case 'concept-illustration':
    default:
      return <ConceptIllustrationVisual state={state} title={title} />;
  }
}

// ── 1. Call Stack Visual ──────────────────────────────────────────
function CallStackVisual({ state }: { state: VisualSceneState }) {
  const items = state.stackItems || [
    { label: 'factorial(1)', value: 'Base Case: return 1', isBaseCase: true },
    { label: 'factorial(2)', value: 'Menunggu 2 * fact(1)' },
    { label: 'factorial(3)', value: 'Menunggu 3 * fact(2)' },
  ];

  return (
    <div className="w-full h-full min-h-[260px] p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-3">
        <span className="flex items-center gap-1.5 text-amber-400">
          <Layers className="w-4 h-4" /> Call Stack Memory (LIFO)
        </span>
        <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
          Depth: {items.length} frame
        </span>
      </div>

      <div className="flex-1 flex flex-col-reverse justify-start gap-2.5 my-4 overflow-y-auto">
        {items.map((item, idx) => {
          const isTop = idx === 0;
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                item.isBaseCase
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : isTop
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 animate-pulse'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded">
                  #{items.length - idx}
                </span>
                <span className="text-xs font-bold font-mono">{item.label}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {state.notes && (
        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{state.notes}</span>
        </div>
      )}
    </div>
  );
}

// ── 2. Loss Landscape Visual ──────────────────────────────────────
function LossLandscapeVisual({ state }: { state: VisualSceneState }) {
  const point = state.lossPoint || { x: 50, y: 15, loss: 1.25, step: 5 };

  return (
    <div className="w-full h-full min-h-[260px] p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-3">
        <span className="flex items-center gap-1.5 text-rose-400">
          <TrendingDown className="w-4 h-4" /> Permukaan Loss: L(W) = W²
        </span>
        <span className="text-[11px] bg-slate-800 px-2.5 py-0.5 rounded text-slate-300 font-mono">
          Loss: {point.loss.toFixed(2)} | Step: {point.step}
        </span>
      </div>

      <div className="flex-1 relative flex items-center justify-center my-4">
        {/* Parabolic Loss Curve SVG */}
        <svg viewBox="0 0 200 100" className="w-full max-w-md h-36 overflow-visible">
          <defs>
            <linearGradient id="gradLoss" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Curve */}
          <path
            d="M 10 15 Q 100 95 190 15"
            fill="url(#gradLoss)"
            stroke="#f43f5e"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Minimum Point Indicator */}
          <circle cx="100" cy="95" r="4" fill="#10b981" />
          <text x="100" y="112" fill="#10b981" fontSize="8" textAnchor="middle" fontWeight="bold">
            Minimum Global
          </text>

          {/* Active Descent Point */}
          {(() => {
            const cx = 10 + (point.x / 100) * 180;
            const t = (point.x - 50) / 50;
            const cy = 95 - (1 - Math.abs(t)) * 0 + t * t * 80;
            return (
              <g>
                <circle cx={cx} cy={Math.min(95, cy)} r="6" fill="#fbbf24" stroke="#ffffff" strokeWidth="2">
                  <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-amber-300">
          <ArrowRight className="w-3.5 h-3.5" /> Arah Pembaruan: W = W - α·∇L
        </span>
        <span className="text-slate-400 font-mono text-[10px]">
          {state.notes || 'Melangkah menuruni gradien menuju minimum.'}
        </span>
      </div>
    </div>
  );
}

// ── 3. Tree Structure Visual ──────────────────────────────────────
function TreeStructureVisual({ state }: { state: VisualSceneState }) {
  const nodes = state.treeNodes || [
    { id: 'r', label: 'Root [50]', isHighlighted: true },
    { id: 'l1', label: 'Cabang [20]', isHighlighted: false },
    { id: 'l2', label: 'Cabang [80]', isHighlighted: true },
    { id: 'leaf', label: 'Leaf [75, 80]', isHighlighted: true },
  ];

  return (
    <div className="w-full h-full min-h-[260px] p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-3">
        <span className="flex items-center gap-1.5 text-blue-400">
          <GitFork className="w-4 h-4" /> Hierarki B-Tree (O(log N))
        </span>
        <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
          Tinggi: 3 tingkat
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 my-4">
        {/* Root */}
        <div className="p-2.5 px-4 rounded-xl border bg-amber-500/20 border-amber-500/50 text-amber-300 text-xs font-mono font-bold shadow-md">
          {nodes[0]?.label || 'Root [50]'}
        </div>
        <div className="w-0.5 h-3 bg-slate-700" />
        {/* Child level */}
        <div className="flex items-center gap-4">
          <div className="p-2 px-3 rounded-lg border bg-slate-900 border-slate-800 text-slate-400 text-xs font-mono">
            {nodes[1]?.label || 'Anak [20]'}
          </div>
          <div className="p-2 px-3 rounded-lg border bg-amber-500/20 border-amber-500/50 text-amber-300 text-xs font-mono font-bold">
            {nodes[2]?.label || 'Anak [80]'}
          </div>
        </div>
        <div className="w-0.5 h-3 bg-slate-700" />
        {/* Leaf */}
        <div className="p-2 px-4 rounded-lg border bg-emerald-500/20 border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold">
          {nodes[3]?.label || 'Leaf Data [75, 80]'} ✨
        </div>
      </div>

      {state.notes && (
        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          💡 {state.notes}
        </div>
      )}
    </div>
  );
}

// ── 4. Code Execution Visual ──────────────────────────────────────
function CodeExecutionVisual({ state }: { state: VisualSceneState }) {
  const line = state.highlightedLine ?? 1;
  const variables = state.variables || { status: 'Executing', step: 1 };

  return (
    <div className="w-full h-full min-h-[260px] p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-3">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Terminal className="w-4 h-4" /> Runtime Code Stepper
        </span>
        <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
          Baris: #{line}
        </span>
      </div>

      <div className="my-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1">
        <div className={line === 1 ? 'text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded' : 'text-slate-400'}>
          1: const start = Date.now();
        </div>
        <div className={line === 2 ? 'text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded' : 'text-slate-400'}>
          2: const response = await processConcept();
        </div>
        <div className={line >= 3 ? 'text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-bold' : 'text-slate-400'}>
          3: return response.ok ? SUCCESS : RETRY;
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400">Variabel Aktif:</span>
        <div className="flex gap-2">
          {Object.entries(variables).map(([k, v]) => (
            <span key={k} className="text-[11px] font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded">
              {k}: {String(v)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 5. Data Flow Visual ───────────────────────────────────────────
function DataFlowVisual({ state }: { state: VisualSceneState }) {
  const stages = state.flowStages || [
    { id: '1', label: 'Call Stack', status: 'done' },
    { id: '2', label: 'Web APIs', status: 'active' },
    { id: '3', label: 'Microtask Queue', status: 'pending' },
  ];

  return (
    <div className="w-full h-full min-h-[260px] p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-3">
        <span className="flex items-center gap-1.5 text-indigo-400">
          <Cpu className="w-4 h-4" /> Alur Pemrosesan Asinkron
        </span>
        <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
          Non-blocking Pipeline
        </span>
      </div>

      <div className="flex-1 flex items-center justify-around my-4 gap-2">
        {stages.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div
              className={`p-3.5 rounded-xl border text-center transition-all ${
                stage.status === 'active'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                  : stage.status === 'done'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">{stage.label}</div>
              <div className="text-[10px] uppercase font-mono mt-1 opacity-70">
                {stage.status}
              </div>
            </div>
            {idx < stages.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {state.notes && (
        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          ⚡ {state.notes}
        </div>
      )}
    </div>
  );
}

// ── 6. Concept Illustration Visual ────────────────────────────────
function ConceptIllustrationVisual({ state, title }: { state: VisualSceneState; title?: string }) {
  const activeNodes = state.activeNodes || ['Fondasi Konsep', 'Arsitektur Logika', 'Penerapan Praktis'];

  return (
    <div className="w-full h-full min-h-[260px] p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/80 pb-3">
        <span className="flex items-center gap-1.5 text-amber-400">
          <Sparkles className="w-4 h-4" /> Eksplanasi Konseptual
        </span>
        <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
          {title || 'Pijar Interactive Visual'}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-4 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {activeNodes.map((node, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {node}
            </span>
          ))}
        </div>
      </div>

      {state.notes && (
        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          💡 {state.notes}
        </div>
      )}
    </div>
  );
}
