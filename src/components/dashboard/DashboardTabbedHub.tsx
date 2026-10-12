'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  ArrowRight,
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  Lock,
  AlertTriangle,
  PlayCircle,
  Plus,
  Compass,
} from 'lucide-react';
import type { CurriculumNode, CurriculumEdge } from '@/types';

interface DashboardTabbedHubProps {
  graphs: Array<{
    id: string;
    topic: string;
    status: string;
    created_at: string;
    nodes_json?: CurriculumNode[];
    edges_json?: CurriculumEdge[];
  }>;
  userName: string;
  defaultNodes: CurriculumNode[];
  defaultEdges: CurriculumEdge[];
  defaultTopicName: string;
}

export function DashboardTabbedHub({
  graphs,
  userName,
  defaultNodes,
  defaultEdges,
  defaultTopicName,
}: DashboardTabbedHubProps) {
  // Client-side fallback if user just completed diagnostic in local session
  const [localGraph, setLocalGraph] = useState<{
    id: string;
    topic: string;
    status: string;
    created_at: string;
    nodes_json?: CurriculumNode[];
    edges_json?: CurriculumEdge[];
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (!graphs || graphs.length === 0)) {
      const storedTopic = sessionStorage.getItem('pijar_topic');
      const storedGraphId = sessionStorage.getItem('pijar_active_graph_id');
      const rawGraph = sessionStorage.getItem('pijar_generated_graph');

      if (storedTopic) {
        let nodes: CurriculumNode[] | undefined;
        let edges: CurriculumEdge[] | undefined;
        if (rawGraph) {
          try {
            const parsed = JSON.parse(rawGraph);
            nodes = parsed.nodes;
            edges = parsed.edges;
          } catch {}
        }
        setLocalGraph({
          id: storedGraphId || 'active-session-graph',
          topic: storedTopic,
          status: 'active',
          created_at: new Date().toISOString(),
          nodes_json: nodes,
          edges_json: edges,
        });
      }
    }
  }, [graphs]);

  const allGraphs = graphs && graphs.length > 0 ? graphs : localGraph ? [localGraph] : [];

  return (
    <div className="space-y-6">
      {/* ── Header: Kurikulum Aktif ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Kurikulum Aktif</h2>
            {allGraphs.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                {allGraphs.length} Aktif
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Peta jalan pembelajaran terstruktur berbasis Knowledge Graph yang sedang kamu pelajari.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Mulai / Eksplorasi Topik Baru
        </Link>
      </div>

      {/* ── Active Curriculum List ────────────────────────── */}
      {allGraphs.length === 0 ? (
        <div className="pijar-gradient-soft rounded-3xl p-8 sm:p-10 border border-amber-500/20 flex flex-col sm:flex-row items-center gap-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              Belum Ada Kurikulum yang Aktif
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Pijar merancang kurikulum adaptif secara dinamis dari keluh kesah dan asesmen awalmu.
              Hanya butuh 3 menit pre-test untuk menyusun Knowledge Graph belajarmu!
            </p>
          </div>
          <Link
            href="/onboarding"
            id="dashboard-start-diagnostic"
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-xl pijar-gradient text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
          >
            Mulai Pre-test Diagnostik <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5">
          {allGraphs.map((g) => {
            const nodes = g.nodes_json || [];
            const completedCount = nodes.filter((n) => n.status === 'completed').length;
            const gapCount = nodes.filter(
              (n) => n.status === 'prerequisite_gap' || n.is_gap
            ).length;
            const readyCount = nodes.filter(
              (n) => n.status === 'ready' || n.status === 'in_progress'
            ).length;
            const lockedCount = nodes.filter((n) => n.status === 'locked').length;
            const totalCount = nodes.length > 0 ? nodes.length : 8;
            const progressPercent =
              totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isPractitioner =
              g.topic.toLowerCase().includes('praktisi') ||
              g.topic.toLowerCase().includes('mahir');

            return (
              <div
                key={g.id}
                className="p-6 sm:p-7 rounded-2xl border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-lg transition-all space-y-5"
              >
                {/* Top Row: Info & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sedang Berjalan
                      </span>
                      {isPractitioner ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black">
                          Track Praktisi Mahir
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Track Fondasi Adaptif
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight pt-1">
                      {g.topic}
                    </h3>
                  </div>

                  <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                    <div>Terakhir diperbarui:</div>
                    <div className="font-medium text-foreground">
                      {new Date(g.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Kemajuan Kurikulum</span>
                    <span className="text-amber-500 font-bold">{progressPercent}% Selesai</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full pijar-gradient rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(progressPercent, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Nodes breakdown stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">{completedCount} Konsep</div>
                      <div className="text-[10px] text-muted-foreground">Telah Dikuasai</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-2.5">
                    <PlayCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {readyCount > 0 ? readyCount : 1} Konsep
                      </div>
                      <div className="text-[10px] text-muted-foreground">Siap Dipelajari</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">{gapCount} Prasyarat</div>
                      <div className="text-[10px] text-muted-foreground">Fokus Penguatan</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">{lockedCount} Konsep</div>
                      <div className="text-[10px] text-muted-foreground">Menunggu Prasyarat</div>
                    </div>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-start sm:self-auto">
                    <BrainCircuit className="w-3.5 h-3.5 text-amber-500" />
                    <span>Total {totalCount} modul konsep saling terhubung (DAG)</span>
                  </div>

                  <Link
                    href={`/graph?id=${encodeURIComponent(g.id)}&topic=${encodeURIComponent(g.topic)}`}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white pijar-gradient shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Buka Knowledge Graph Personal
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
