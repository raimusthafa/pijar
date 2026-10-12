'use client';

import React from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  BookOpen,
} from 'lucide-react';
import type { CurriculumNode, CurriculumEdge } from '@/types';
import { computeMasteryMetrics } from '@/lib/mastery/engine';

interface MasteryTrackingViewProps {
  nodes: CurriculumNode[];
  edges: CurriculumEdge[];
  topicName?: string;
  graphId?: string;
}

export function MasteryTrackingView({
  nodes,
  edges,
  topicName = 'Kurikulum Aktif',
  graphId = 'demo-graph',
}: MasteryTrackingViewProps) {
  const metrics = React.useMemo(() => {
    return computeMasteryMetrics(nodes, edges);
  }, [nodes, edges]);

  // SVG Circular Ring calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.completionPercentage / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* ── Top Overview Banner ────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Award className="w-3.5 h-3.5" />
            Mastery & Completion Tracking
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Penguasaan Konsep: {topicName}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Statistik pencapaian kurikulum dihitung secara deterministik berdasarkan evaluasi checkpoint kuis dan penuntasan rantai prasyarat.
          </p>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-36 h-36 -rotate-90">
            {/* Background track */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="text-muted/40 stroke-current"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated progress ring */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="text-amber-500 stroke-current transition-all duration-1000 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold text-foreground">
              {metrics.completionPercentage}%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Selesai
            </span>
          </div>
        </div>
      </div>

      {/* ── Metric Stats Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Dikuasai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {metrics.completedConcepts}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            dari {metrics.totalConcepts} konsep total
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Siap Dipelajari</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {metrics.readyConcepts}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Prasyarat 100% tuntas
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Terkunci</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {metrics.lockedConcepts}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Menunggu prasyarat
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Knowledge Gap</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {metrics.gapConcepts}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Prioritas remedi AI
          </div>
        </div>
      </div>

      {/* ── Category Breakdown Bars ────────────────────────── */}
      <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            Distribusi Penguasaan Berdasarkan Kategori
          </h3>
          <span className="text-xs text-muted-foreground">
            {metrics.categoryBreakdown.length} bidang kajian
          </span>
        </div>

        <div className="space-y-3">
          {metrics.categoryBreakdown.map(cat => (
            <div key={cat.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{cat.category}</span>
                <span className="text-muted-foreground font-mono">
                  {cat.completed}/{cat.total} ({cat.percentage}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottlenecks & Next Recommended Action ─────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bottleneck Alert */}
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Titik Hambatan Prasyarat (Bottlenecks)
          </div>
          {metrics.bottlenecks.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              🎉 Tidak ada hambatan prasyarat aktif. Semua konsep siap dipelajari secara berurutan.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-foreground/90">
                Konsep berikut memblokir konsep tingkat lanjut dan disarankan dituntaskan terlebih dahulu:
              </p>
              {metrics.bottlenecks.map(b => (
                <div
                  key={b.nodeId}
                  className="p-3 rounded-xl bg-card border border-border/80 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-foreground">{b.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Memblokir: {b.blockedDownstreamLabels.slice(0, 2).join(', ')}
                      {b.blockedDownstreamLabels.length > 2 ? ` (+${b.blockedDownstreamLabels.length - 2} lainnya)` : ''}
                    </div>
                  </div>
                  <Link
                    href={`/learn/${graphId}/${b.nodeId}`}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/20 transition-colors"
                  >
                    Buka →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Next Step */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Rekomendasi Langkah Berikutnya
            </div>
            {metrics.recommendedNextNode ? (
              <>
                <h4 className="text-base font-bold text-foreground">
                  {metrics.recommendedNextNode.label}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {metrics.recommendationReason}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Seluruh materi dalam kurikulum ini telah selesai dipelajari!
              </p>
            )}
          </div>

          {metrics.recommendedNextNode && (
            <Link
              href={`/learn/${graphId}/${metrics.recommendedNextNode.id}`}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white pijar-gradient shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Mulai Pelajari Konsep Ini
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
