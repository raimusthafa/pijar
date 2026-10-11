'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RotateCcw,
  BookOpen,
  Compass,
  Zap,
  Info,
  Loader2,
} from 'lucide-react';

import type { DiagnosticResult } from '@/types';
import type { EnrichedConceptNode } from '@/lib/graph/types';
import { adaptDiagnosticToGraph } from '@/lib/graph/adapter';
import { computeGraphSummary, recommendNextConcept } from '@/lib/graph/engine';
import { getMasteredNodes, saveActiveGraph } from '@/lib/graph/storage';
import { CurriculumCanvas } from '@/components/graph/CurriculumCanvas';
import { createClient } from '@/lib/supabase/client';

// Topic display names
const TOPIC_NAMES: Record<string, string> = {
  dsa: 'Struktur Data & Algoritma',
  ml: 'Machine Learning',
  math: 'Matematika Diskrit',
  db: 'Database & SQL',
  web: 'Web Development',
  stats: 'Statistik & Probabilitas',
};

export default function KnowledgeGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Menyiapkan Kanvas Knowledge Graph...
            </p>
          </div>
        </div>
      }
    >
      <KnowledgeGraphContent />
    </Suspense>
  );
}

function KnowledgeGraphContent() {
  const searchParams = useSearchParams();

  // URL state
  const paramTopic = searchParams.get('topic') || '';
  const paramGraphId = searchParams.get('id') || 'demo-graph';

  // Resolved topic
  const [topicKey, setTopicKey] = useState<string>('dsa');
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticResult | null>(null);
  const [masteredNodes, setMasteredNodes] = useState<string[]>([]);
  const [cloudGraph, setCloudGraph] = useState<{
    topicName: string;
    nodes: EnrichedConceptNode[];
    edges: any[];
  } | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      // Read from searchParams or sessionStorage
      const storedTopic = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_topic') : null;
      const finalTopicKey = paramTopic || storedTopic || 'dsa';
      if (!isCancelled) setTopicKey(finalTopicKey);

      // If paramGraphId looks like a Supabase UUID, try fetching from Supabase
      if (paramGraphId && paramGraphId !== 'demo-graph' && paramGraphId.length >= 32) {
        try {
          const supabase = createClient();
          const { data: dbGraph } = await supabase
            .from('learning_graphs')
            .select('id, topic, nodes_json, edges_json')
            .eq('id', paramGraphId)
            .maybeSingle();

          if (dbGraph && Array.isArray(dbGraph.nodes_json) && dbGraph.nodes_json.length > 0 && !isCancelled) {
            setCloudGraph({
              topicName: dbGraph.topic,
              nodes: dbGraph.nodes_json as EnrichedConceptNode[],
              edges: dbGraph.edges_json,
            });
          }
        } catch (fetchErr) {
          console.warn('Failed to load cloud graph:', fetchErr);
        }
      }

      // Read stored diagnostic result if available
      if (typeof window !== 'undefined') {
        const rawStoredResult = sessionStorage.getItem('pijar_diagnostic_result');
        if (rawStoredResult) {
          try {
            const parsed = JSON.parse(rawStoredResult) as DiagnosticResult;
            if (!isCancelled) setDiagnosticData(parsed);
          } catch {
            // ignore parsing error
          }
        }
        const mastered = getMasteredNodes(finalTopicKey);
        if (!isCancelled) setMasteredNodes(mastered);
      }

      if (!isCancelled) setIsClientLoaded(true);
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [paramTopic, paramGraphId]);

  // Adapt graph data based on cloud data, topic, diagnostic results, and mastered nodes
  const graphData = useMemo(() => {
    if (cloudGraph) {
      const masteredSet = new Set(masteredNodes);
      const updatedNodes = cloudGraph.nodes.map(n => {
        if (masteredSet.has(n.id)) {
          return { ...n, status: 'completed' as const };
        }
        return n;
      });
      return {
        topicName: cloudGraph.topicName,
        nodes: updatedNodes,
        edges: cloudGraph.edges,
        isDemoFallback: false,
      };
    }
    const rawTopic = TOPIC_NAMES[topicKey] || topicKey || 'Struktur Data & Algoritma';
    return adaptDiagnosticToGraph(rawTopic, diagnosticData, masteredNodes);
  }, [cloudGraph, topicKey, diagnosticData, masteredNodes]);

  // Synchronize graph state to local storage and active topic cookies
  useEffect(() => {
    if (graphData && isClientLoaded) {
      saveActiveGraph(graphData.topicName, paramGraphId, graphData.nodes, graphData.edges);
    }
  }, [graphData, paramGraphId, isClientLoaded]);

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    return computeGraphSummary(graphData.nodes);
  }, [graphData.nodes]);

  // Top Recommendation
  const recommendation = useMemo(() => {
    return recommendNextConcept(graphData.nodes, graphData.edges);
  }, [graphData.nodes, graphData.edges]);

  if (!isClientLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="h-16 shrink-0 z-30 glass border-b border-border/60 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold hidden sm:inline">Dashboard</span>
          </Link>

          <div className="w-px h-5 bg-border hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg pijar-gradient flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Knowledge Graph Kurikulum
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Pemetaan Prasyarat Belajar Personal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Topic Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <BrainCircuit className="w-3.5 h-3.5" />
            {graphData.topicName}
          </span>

          {/* Demo Fallback Badge */}
          {graphData.isDemoFallback && (
            <span
              title="Graf ini menggunakan data acuan terarah. Lakukan pre-test untuk personalisasi gap."
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              Demo Data
            </span>
          )}

          {/* Retake Diagnostic Link */}
          <Link
            href={`/diagnostic?topic=${encodeURIComponent(topicKey)}`}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-border hover:bg-muted/60 transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Diagnosa Ulang</span>
          </Link>
        </div>
      </header>

      {/* ── KPI & Pedagogical Summary Ribbon ──────────────── */}
      <section className="shrink-0 z-20 border-b border-border/50 bg-card/60 backdrop-blur-sm px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-muted-foreground font-medium">Dikuasai:</span>
            <strong className="text-foreground font-bold">
              {summaryMetrics.masteredCount} / {summaryMetrics.totalConcepts} Konsep
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground font-medium">Akar Gap Prasyarat:</span>
            <strong className="text-amber-500 font-bold">
              {summaryMetrics.unresolvedGapsCount} Terdeteksi
            </strong>
          </div>

          <div className="flex items-center gap-2 hidden lg:flex">
            <Layers className="w-4 h-4 text-sky-500" />
            <span className="text-muted-foreground font-medium">Siap Dipelajari:</span>
            <strong className="text-foreground font-bold">
              {summaryMetrics.readyCount} Materi
            </strong>
          </div>

          {/* Progress Percent Bar */}
          <div className="hidden xl:flex items-center gap-2 min-w-[140px]">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full pijar-gradient rounded-full transition-all duration-500"
                style={{ width: `${summaryMetrics.completionPercentage}%` }}
              />
            </div>
            <span className="font-bold text-foreground">
              {summaryMetrics.completionPercentage}%
            </span>
          </div>
        </div>

        {/* Next Recommended Concept Banner */}
        {recommendation.recommendedNode && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline">Rekomendasi Utama:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {recommendation.recommendedNode.label}
            </span>
          </div>
        )}
      </section>

      {/* ── Main Canvas Workspace ──────────────────────────── */}
      <main className="flex-1 w-full h-full relative overflow-hidden">
        <CurriculumCanvas
          initialNodes={graphData.nodes}
          initialEdges={graphData.edges}
          topicName={graphData.topicName}
          graphId={paramGraphId}
        />
      </main>
    </div>
  );
}
