'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Flame,
  Zap,
} from 'lucide-react';
import type { CurriculumNode, CurriculumEdge } from '@/types';
import { generateStudySchedule, type StudySchedulePlan } from '@/lib/scheduler/engine';

interface LearningSchedulerViewProps {
  nodes: CurriculumNode[];
  edges: CurriculumEdge[];
  graphId?: string;
  initialTargetMinutes?: number;
}

export function LearningSchedulerView({
  nodes,
  edges,
  graphId = 'demo-graph',
  initialTargetMinutes = 45,
}: LearningSchedulerViewProps) {
  const [targetMinutes, setTargetMinutes] = useState<number>(initialTargetMinutes);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  // Load completed tasks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pijar_scheduler_completed');
      if (stored) {
        setCompletedTaskIds(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  const plan: StudySchedulePlan = React.useMemo(() => {
    return generateStudySchedule(nodes, edges, targetMinutes, completedTaskIds);
  }, [nodes, edges, targetMinutes, completedTaskIds]);

  const toggleTaskDone = (taskId: string) => {
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      try {
        localStorage.setItem('pijar_scheduler_completed', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const dayLabels = ['Hari Ini', 'Besok', 'Lusa'];

  return (
    <div className="space-y-6">
      {/* ── Scheduler Header & Target Config ───────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Calendar className="w-3.5 h-3.5" />
            Adaptive Learning Scheduler
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Jadwal Belajar Harian & Rencana Studi
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Jadwal disusun secara adaptif memprioritaskan penutupan gap pengetahuan dan materi yang siap dipelajari, disesuaikan dengan alokasi waktumu.
          </p>
        </div>

        {/* Study Target Selector */}
        <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center gap-2 text-xs">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold text-foreground">Target Harian:</span>
          <div className="flex gap-1">
            {[30, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => setTargetMinutes(mins)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  targetMinutes === mins
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Schedule Timeline Cards ────────────────────────── */}
      {plan.items.length === 0 ? (
        <div className="p-10 rounded-3xl bg-card border border-border text-center space-y-3">
          <Flame className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold">Semua Konsep Selesai!</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Kamu telah menuntaskan seluruh rencana belajar pada topik ini. Mulai topik baru di halaman onboarding!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[0, 1, 2].map(dayIdx => {
            const dayItems = plan.items.filter(it => it.dayOffset === dayIdx);
            if (dayItems.length === 0) return null;

            return (
              <div key={dayIdx} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
                    {dayLabels[dayIdx]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ~{dayItems.reduce((acc, it) => acc + it.estimatedMinutes, 0)} menit total
                  </span>
                </div>

                <div className="grid gap-3">
                  {dayItems.map(item => {
                    const isDone = completedTaskIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          isDone
                            ? 'bg-muted/30 border-border/50 opacity-60'
                            : 'bg-card border-border hover:border-amber-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTaskDone(item.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-border hover:border-amber-500 text-transparent'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold text-sm text-foreground ${
                                  isDone ? 'line-through text-muted-foreground' : ''
                                }`}
                              >
                                {item.conceptLabel}
                              </span>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  item.priority === 'high'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    : item.priority === 'review'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {item.priority === 'high'
                                  ? 'Prioritas Tinggi (Gap)'
                                  : item.priority === 'review'
                                  ? 'Ulas Kembali'
                                  : 'Siap Dipelajari'}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                              💡 <strong>Rasional:</strong> {item.rationale}
                            </p>
                          </div>
                        </div>

                        {/* Right Details & Action */}
                        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs text-muted-foreground font-mono">
                            ~{item.estimatedMinutes}m
                          </span>

                          <Link
                            href={`/learn/${graphId}/${item.nodeId}`}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white pijar-gradient shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Mulai
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
