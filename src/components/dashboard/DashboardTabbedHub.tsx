'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Award,
  Calendar,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { CurriculumNode, CurriculumEdge } from '@/types';
import { MasteryTrackingView } from './MasteryTrackingView';
import { LearningSchedulerView } from './LearningSchedulerView';
import { CommunityView } from './CommunityView';

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
  const [activeTab, setActiveTab] = useState<'curriculum' | 'mastery' | 'scheduler' | 'community'>('curriculum');

  const activeGraph = graphs && graphs.length > 0 ? graphs[0] : null;
  const nodes = (activeGraph?.nodes_json && activeGraph.nodes_json.length > 0)
    ? activeGraph.nodes_json
    : defaultNodes;
  const edges = (activeGraph?.edges_json && activeGraph.edges_json.length > 0)
    ? activeGraph.edges_json
    : defaultEdges;
  const topicName = activeGraph?.topic || defaultTopicName;
  const graphId = activeGraph?.id || 'demo-graph';

  return (
    <div className="space-y-6">
      {/* ── Navigation Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/60 border border-border/60 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'curriculum'
              ? 'bg-card text-foreground font-bold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitBranch className="w-4 h-4 text-amber-500" />
          <span>Kurikulum Aktif</span>
          {graphs.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
              {graphs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mastery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'mastery'
              ? 'bg-card text-foreground font-bold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-500" />
          <span>Mastery Tracking (F8)</span>
        </button>

        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'scheduler'
              ? 'bg-card text-foreground font-bold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>Jadwal Belajar (F9)</span>
        </button>

        <button
          onClick={() => setActiveTab('community')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'community'
              ? 'bg-card text-foreground font-bold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-purple-500" />
          <span>Komunitas Belajar (F10)</span>
        </button>
      </div>

      {/* ── Tab Contents ────────────────────────────────────── */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {!graphs || graphs.length === 0 ? (
            <div className="pijar-gradient-soft rounded-3xl p-8 border border-amber-500/20 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1">
                <div className="text-3xl mb-3">🚀</div>
                <h2 className="text-xl font-bold mb-2">Mulai diagnosa pertamamu</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Jawab 5 soal singkat untuk mendapatkan Knowledge Graph kurikulum yang personal.
                  Hanya butuh ~3 menit!
                </p>
              </div>
              <Link
                href="/onboarding"
                id="dashboard-start-diagnostic"
                className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl pijar-gradient text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg"
              >
                Mulai Pre-test <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Daftar Kurikulum Aktif</h3>
                <Link
                  href="/onboarding"
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Mulai topik baru <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid gap-3">
                {graphs.map(g => (
                  <Link
                    key={g.id}
                    href={`/graph?id=${encodeURIComponent(g.id)}`}
                    className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-amber-400 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{g.topic}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Dibuat: {new Date(g.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 hidden sm:inline">
                        Buka Knowledge Graph
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Previews of F8 & F10 */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div
              onClick={() => setActiveTab('mastery')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground mb-1">Mastery Tracking</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lihat statistik penguasaan konsep, tingkat kelulusan kurikulum, dan titik hambatan prasyarat.
              </p>
              <span className="inline-block mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Buka Statistik Mastery →
              </span>
            </div>

            <div
              onClick={() => setActiveTab('scheduler')}
              className="p-6 rounded-2xl border border-border bg-card hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground mb-1">Learning Scheduler</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rencana belajar adaptif harian berdasarkan alokasi waktu dan prioritas knowledge gap.
              </p>
              <span className="inline-block mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Buka Jadwal Belajar →
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mastery' && (
        <MasteryTrackingView
          nodes={nodes}
          edges={edges}
          topicName={topicName}
          graphId={graphId}
        />
      )}

      {activeTab === 'scheduler' && (
        <LearningSchedulerView
          nodes={nodes}
          edges={edges}
          graphId={graphId}
        />
      )}

      {activeTab === 'community' && (
        <CommunityView currentUserName={userName} />
      )}
    </div>
  );
}
