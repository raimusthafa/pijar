'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  ArrowRight,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  GitFork,
  BookOpen,
} from 'lucide-react';
import type { EnrichedConceptNode, PrerequisiteChainResult } from '@/lib/graph/types';

interface GraphInspectorProps {
  selectedNode: EnrichedConceptNode | null;
  chainInfo: PrerequisiteChainResult | null;
  allNodesMap: Map<string, EnrichedConceptNode>;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onFocusNode: (nodeId: string) => void;
  onHighlightChain: (nodeId: string) => void;
  isChainHighlighted: boolean;
  graphId?: string;
}

export function GraphInspector({
  selectedNode,
  chainInfo,
  allNodesMap,
  onClose,
  onSelectNode,
  onFocusNode,
  onHighlightChain,
  isChainHighlighted,
  graphId = 'demo-graph',
}: GraphInspectorProps) {
  if (!selectedNode) return null;

  const isGap = selectedNode.status === 'prerequisite_gap' || selectedNode.is_gap;
  const isCompleted = selectedNode.status === 'completed';
  const isReady = selectedNode.status === 'ready';
  const isLocked = selectedNode.status === 'locked';

  const directPrereqNodes = (chainInfo?.directPrerequisites || [])
    .map(id => allNodesMap.get(id))
    .filter((n): n is EnrichedConceptNode => Boolean(n));

  const downstreamNodes = (chainInfo?.unlockedDownstream || [])
    .map(id => allNodesMap.get(id))
    .filter((n): n is EnrichedConceptNode => Boolean(n));

  const unresolvedPrereqs = (chainInfo?.unresolvedPrerequisites || [])
    .map(id => allNodesMap.get(id))
    .filter((n): n is EnrichedConceptNode => Boolean(n));

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full bg-card/95 backdrop-blur-xl border-l border-border/70 flex flex-col shadow-2xl z-20 animate-fade-in-up">
      {/* ── Inspector Header ─────────────────────────────────── */}
      <div className="p-5 border-b border-border/60 flex items-start justify-between gap-3 bg-muted/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted">
              {selectedNode.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : isGap
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : isReady
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-muted text-muted-foreground border border-border/50'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Dikuasai
                </>
              ) : isGap ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Gap Prasyarat
                </>
              ) : isReady ? (
                <>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Siap Belajar
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  Terkunci
                </>
              )}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-snug">
            {selectedNode.label}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Tutup panel inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Scrollable Inspector Content ─────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
        {/* Description */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Ikhtisar Konsep
          </h3>
          <p className="text-foreground/90 leading-relaxed text-sm">
            {selectedNode.description}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Estimasi Waktu: <strong className="text-foreground">{selectedNode.estimated_minutes} Menit</strong>
            </span>
          </div>
        </div>

        {/* ── Root Gap Justification (If Gap Node) ───────────── */}
        {isGap && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Akar Kesenjangan Pengetahuan (Root Knowledge Gap)
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedNode.justification ||
                'Konsep ini teridentifikasi sebagai prasyarat fundamental yang belum dikuasai pada hasil pre-test. Menguasai materi ini wajib dilakukan sebelum mempelajari konsep turunan berikutnya.'}
            </p>
          </div>
        )}

        {/* ── Prerequisite Readiness Status ──────────────────── */}
        <div className="p-3.5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Status Prasyarat
            </span>
            {chainInfo?.isBlocked ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                <ShieldAlert className="w-3.5 h-3.5" />
                Terblokir Prasyarat
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                <ShieldCheck className="w-3.5 h-3.5" />
                Prasyarat Terpenuhi
              </span>
            )}
          </div>

          {chainInfo?.isBlocked ? (
            <div className="text-xs text-muted-foreground">
              Ada <strong className="text-rose-500 font-semibold">{unresolvedPrereqs.length} materi prasyarat</strong> yang harus dituntaskan terlebih dahulu sebelum kamu bisa memahami konsep ini dengan baik.
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Kamu sudah menguasai seluruh fondasi yang dibutuhkan untuk mempelajari materi ini dengan mudah!
            </div>
          )}
        </div>

        {/* ── Direct Prerequisites List ──────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Prasyarat Langsung ({directPrereqNodes.length})
            </h3>
            <span className="text-[10px] text-muted-foreground">Materi Sebelum</span>
          </div>

          {directPrereqNodes.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground bg-muted/20">
              🌱 <strong>Fondasi Awal:</strong> Konsep ini tidak memerlukan prasyarat materi lain dan dapat langsung dipelajari.
            </div>
          ) : (
            <div className="space-y-1.5">
              {directPrereqNodes.map(prereq => (
                <button
                  key={prereq.id}
                  onClick={() => onSelectNode(prereq.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {prereq.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : prereq.status === 'prerequisite_gap' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-amber-500 transition-colors">
                      {prereq.label}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Unlocked Downstream Concepts ───────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5" />
              Materi Terbuka Berikutnya ({downstreamNodes.length})
            </h3>
            <span className="text-[10px] text-muted-foreground">Materi Sesudah</span>
          </div>

          {downstreamNodes.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground bg-muted/20">
              🎯 <strong>Materi Puncak:</strong> Konsep capaian lanjutan dalam kurikulum ini.
            </div>
          ) : (
            <div className="space-y-1.5">
              {downstreamNodes.map(child => (
                <button
                  key={child.id}
                  onClick={() => onSelectNode(child.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-amber-500 transition-colors">
                      {child.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground shrink-0">
                    ~{child.estimated_minutes}m
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Inspector Bottom Actions ─────────────────────────── */}
      <div className="p-4 border-t border-border/60 bg-card space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFocusNode(selectedNode.id)}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-muted-foreground" />
            Pusatkan Graf
          </button>

          <button
            onClick={() => onHighlightChain(selectedNode.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
              isChainHighlighted
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-border hover:bg-muted text-muted-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {isChainHighlighted ? 'Reset Sorotan' : 'Sorot Rantai'}
          </button>
        </div>

        {/* Start / Learn Action */}
        <Link
          href={`/learn/${graphId}/${selectedNode.id}`}
          className="w-full py-3 rounded-xl font-bold text-sm text-white pijar-gradient shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          {isCompleted ? 'Ulas Kembali Materi' : 'Mulai Belajar Materi Ini'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}
