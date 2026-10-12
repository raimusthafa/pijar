'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  Loader2,
  RotateCcw,
  Clock,
  Layers,
  ShieldAlert,
  Zap,
  Target,
  Info,
  HelpCircle,
} from 'lucide-react';
import type {
  DiagnosticQuestion,
  DiagnosticResult,
  KnowledgeGap,
  ConfidenceLevel,
} from '@/types';

// Curated topic name mapper as friendly helper
const TOPIC_NAMES: Record<string, string> = {
  dsa: 'Struktur Data & Algoritma',
  ml: 'Machine Learning & AI',
  math: 'Matematika Diskrit',
  db: 'Database & SQL Architecture',
  web: 'Web & Fullstack Dev',
  stats: 'Statistik & Probabilitas',
  devops: 'DevOps & Cloud Systems',
  cyber: 'Cybersecurity & Security',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function DiagnosticPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Menyiapkan modul diagnostik adaptif...</p>
          </div>
        </div>
      }
    >
      <DiagnosticContent />
    </Suspense>
  );
}

function DiagnosticContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [topicKey, setTopicKey] = useState<string>('dsa');
  const [topicName, setTopicName] = useState<string>('Struktur Data & Algoritma');
  const [requestedCount, setRequestedCount] = useState<number>(5);
  const [stage, setStage] = useState<'intro' | 'quiz' | 'analyzing' | 'result'>('intro');

  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [confidenceLevels, setConfidenceLevels] = useState<Record<number, ConfidenceLevel>>({});

  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DiagnosticResult | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState<string>('Mengevaluasi penalaran konseptual & metakognisi...');

  // Initialize topic & count from URL param or sessionStorage
  useEffect(() => {
    const paramTopic = searchParams.get('topic');
    const paramCount = Number(searchParams.get('count'));
    const storedTopic = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_topic') : null;
    const storedTopicKey = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_topic_key') : null;
    const storedCount = typeof window !== 'undefined' ? Number(sessionStorage.getItem('pijar_diagnostic_count')) : 5;

    const finalName = paramTopic || storedTopic || 'Struktur Data & Algoritma';
    const finalKey = storedTopicKey || (TOPIC_NAMES[finalName] ? finalName : 'custom');
    const finalCount = paramCount === 10 || storedCount === 10 ? 10 : 5;

    setTopicName(TOPIC_NAMES[finalName] || finalName);
    setTopicKey(finalKey);
    setRequestedCount(finalCount);
  }, [searchParams]);

  // Start Diagnostic: Fetch Questions from Dynamic AI API
  async function handleStartQuiz() {
    setLoadingQuestions(true);
    try {
      const storedGoal = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_goal') : 'Persiapan Komprehensif';
      const res = await fetch('/api/diagnostic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          target_goal: storedGoal || 'Persiapan Komprehensif',
          question_count: requestedCount,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setSelectedAnswers({});
        // Default confidence to medium for all questions
        const initialConfidence: Record<number, ConfidenceLevel> = {};
        data.questions.forEach((_: any, idx: number) => {
          initialConfidence[idx] = 'medium';
        });
        setConfidenceLevels(initialConfidence);
        setStage('quiz');
      } else {
        throw new Error(data.error || 'Gagal memuat pertanyaan diagnostik');
      }
    } catch (err) {
      console.error('Failed to start diagnostic quiz:', err);
      alert('Terjadi kendala saat memuat soal pre-test. Coba beberapa saat lagi.');
    } finally {
      setLoadingQuestions(false);
    }
  }

  // Answer selection
  function handleSelectOption(optionIndex: number) {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  }

  // Confidence selection
  function handleSelectConfidence(level: ConfidenceLevel) {
    setConfidenceLevels(prev => ({
      ...prev,
      [currentIndex]: level,
    }));
  }

  // Next Question
  function handleNextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinishAndAnalyze();
    }
  }

  // Prev Question
  function handlePrevQuestion() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }

  // Finish and trigger AI gap detection & dynamic DAG generation
  async function handleFinishAndAnalyze() {
    setStage('analyzing');

    const timer1 = setTimeout(() => {
      setAnalyzingStep('Menganalisis matriks keyakinan metakognisi (misconceptions vs gaps)...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setAnalyzingStep('Menghitung ketergantungan konsep prasyarat (prerequisites DAG)...');
    }, 2400);

    const timer3 = setTimeout(() => {
      setAnalyzingStep('Menyusun arsitektur Knowledge Graph personal (zero template)...');
    }, 3800);

    try {
      const storedGoal = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_goal') : 'Persiapan Komprehensif';
      const payloadAnswers = questions.map((q, idx) => ({
        question_id: q.id,
        question: q.question,
        options: q.options,
        selected_option: selectedAnswers[idx] ?? -1,
        confidence_level: confidenceLevels[idx] ?? 'medium',
        concept_tested: q.concept_tested,
        correct_index: q.correct_index,
        explanation: q.explanation,
        target_node_id: q.target_node_id,
      }));

      const res = await fetch('/api/diagnostic/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          target_goal: storedGoal,
          answers: payloadAnswers,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setAnalysisResult(data.result);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pijar_diagnostic_result', JSON.stringify(data.result));
          if (data.graph) {
            sessionStorage.setItem('pijar_generated_graph', JSON.stringify(data.graph));
          }
          document.cookie = `pijar_active_topic=${encodeURIComponent(topicName)}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `pijar_active_graph_id=${encodeURIComponent(data.result.graph_id || '')}; path=/; max-age=604800; SameSite=Lax`;
        }
        setStage('result');
      } else {
        throw new Error(data.error || 'Analisis gagal');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Gagal menganalisis jawaban secara lengkap. Membuka hasil evaluasi lokal.');
      setStage('result');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    }
  }

  // Proceed to Knowledge Graph with real persisted UUID
  function handleProceedToGraph() {
    const targetGraphId = analysisResult?.graph_id || 'demo-graph';
    router.push(`/graph?id=${encodeURIComponent(targetGraphId)}&topic=${encodeURIComponent(topicName)}`);
  }

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const isAnswered = selectedAnswers[currentIndex] !== undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pijar
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BrainCircuit className="w-3.5 h-3.5" />
              {topicName}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
              {requestedCount} Butir Soal
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col justify-center">

        {/* ════════ STAGE 1: INTRO ════════ */}
        {stage === 'intro' && (
          <div className="max-w-2xl mx-auto w-full text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10 animate-bounce-subtle">
              <Zap className="w-8 h-8" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
              Pre-test Diagnostik Adaptif
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
              Pijar telah merancang <span className="text-foreground font-semibold">{requestedCount} pertanyaan terarah</span> untuk domain <span className="text-amber-500 font-semibold">{topicName}</span>. Asesmen ini mengukur pemahaman konsep dan penalaran kasus nyata untuk menyusun Knowledge Graph belajarmu secara personal.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
              <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-amber-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Cepat & Berbobot</h3>
                <p className="text-xs text-muted-foreground">Menilai kedalaman pemahaman tanpa tekanan nilai kelulusan.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
                <ShieldAlert className="w-5 h-5 text-rose-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Deteksi Miskonsepsi</h3>
                <p className="text-xs text-muted-foreground">Memisahkan kesalahan asumsi aktif dengan materi yang belum dipelajari.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
                <Layers className="w-5 h-5 text-amber-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Zero-Template DAG</h3>
                <p className="text-xs text-muted-foreground">Kurikulum Knowledge Graph dibuat murni dari hasil asesmenmu.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="btn-start-diagnostic"
                onClick={handleStartQuiz}
                disabled={loadingQuestions}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white pijar-gradient shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingQuestions ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyusun Soal Adaptif AI...
                  </>
                ) : (
                  <>
                    Mulai Diagnostik ({requestedCount} Soal)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium border border-border hover:bg-muted/50 transition-colors text-muted-foreground text-center"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ════════ STAGE 2: ACTIVE QUIZ ════════ */}
        {stage === 'quiz' && currentQ && (
          <div className="max-w-2xl mx-auto w-full py-2">
            {/* Progress Bar & Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                <span>Soal {currentIndex + 1} dari {questions.length}</span>
                <span className="text-amber-500 font-bold">{progressPercent}% Selesai</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full pijar-gradient transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-border/80 bg-card/90 shadow-xl backdrop-blur-md mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 pijar-gradient opacity-60" />

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Target className="w-3.5 h-3.5" />
                  Konsep: {currentQ.concept_tested}
                </div>

                {currentQ.difficulty_tier && (
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    currentQ.difficulty_tier === 'advanced'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : currentQ.difficulty_tier === 'intermediate'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {currentQ.difficulty_tier === 'advanced' ? 'Tingkat: Kasus Arsitektur' : currentQ.difficulty_tier === 'intermediate' ? 'Tingkat: Mekanika & Trade-off' : 'Tingkat: Fondasi'}
                  </span>
                )}
              </div>

              {/* Scenario Context (if provided) */}
              {currentQ.scenario_context && (
                <div className="mb-4 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs sm:text-sm flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                      Skenario Masalah:
                    </span>
                    <p className="leading-relaxed text-muted-foreground">{currentQ.scenario_context}</p>
                  </div>
                </div>
              )}

              {/* Question Text */}
              <h2 className="text-base sm:text-lg font-bold mb-6 text-foreground leading-snug">
                {currentQ.question}
              </h2>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      id={`option-${currentIndex}-${optIdx}`}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 group cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50 shadow-md'
                          : 'border-border/60 hover:border-amber-500/40 hover:bg-muted/40'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-muted text-muted-foreground group-hover:bg-amber-500/20 group-hover:text-amber-500'
                        }`}
                      >
                        {OPTION_LETTERS[optIdx]}
                      </div>
                      <span className={`text-xs sm:text-sm leading-relaxed pt-0.5 ${
                        isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Metacognitive Confidence Selector */}
              {isAnswered && (
                <div className="pt-4 border-t border-border/50 animate-fade-in">
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    Seberapa yakin kamu dengan jawaban ini?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectConfidence('low')}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                        confidenceLevels[currentIndex] === 'low'
                          ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-sm'
                          : 'border-border bg-background/60 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      🤷 Ragu / Menebak
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectConfidence('medium')}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                        confidenceLevels[currentIndex] === 'medium'
                          ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-sm'
                          : 'border-border bg-background/60 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      🤔 Cukup Yakin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectConfidence('high')}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                        confidenceLevels[currentIndex] === 'high'
                          ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-sm'
                          : 'border-border bg-background/60 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      🎯 Sangat Yakin
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevQuestion}
                disabled={currentIndex === 0}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-border flex items-center gap-2 transition-colors ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Sebelumnya
              </button>

              <button
                id="btn-next-question"
                onClick={handleNextQuestion}
                disabled={!isAnswered}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                  isAnswered
                    ? 'pijar-gradient text-white shadow-md shadow-amber-500/20 hover:scale-[1.02] cursor-pointer'
                    : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
              >
                {currentIndex === questions.length - 1 ? (
                  <>
                    Analisis & Sintesis Graf AI
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Selanjutnya
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ════════ STAGE 3: ANALYZING (LOADING) ════════ */}
        {stage === 'analyzing' && (
          <div className="max-w-md mx-auto w-full text-center py-12">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full pijar-gradient blur-xl opacity-40 animate-pulse" />
              <div className="relative w-full h-full rounded-full border-2 border-amber-500/30 flex items-center justify-center glass shadow-2xl">
                <BrainCircuit className="w-10 h-10 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2 tracking-tight">Menyusun Knowledge Graph...</h2>
            <p className="text-amber-500 text-sm font-medium animate-pulse mb-6">
              {analyzingStep}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              AI Pijar sedang mengonstruksi graf kurikulum bebas siklus (DAG) yang dipersonalisasi khusus untukmu.
            </p>
          </div>
        )}

        {/* ════════ STAGE 4: RESULTS & GAP ANALYSIS ════════ */}
        {stage === 'result' && analysisResult && (
          <div className="max-w-3xl mx-auto w-full py-4 space-y-8 animate-fade-in">
            {/* Top Stat Banner */}
            <div className="p-6 sm:p-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md relative overflow-hidden shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Laporan Diagnostik & Sintesis Selesai
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                    Pemetaan Kurikulum: {analysisResult.topic}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                    {analysisResult.summary_narrative}
                  </p>
                </div>

                <div className="shrink-0 p-4 rounded-xl bg-card border border-border text-center min-w-[120px] shadow-sm">
                  <span className="text-3xl font-extrabold text-amber-500">
                    {analysisResult.correct_count}
                    <span className="text-base text-muted-foreground font-normal"> / {analysisResult.total_questions}</span>
                  </span>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">
                    Skor Pemahaman
                  </div>
                </div>
              </div>
            </div>

            {/* Metacognitive Confidence Matrix */}
            {analysisResult.confidence_matrix && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-amber-500" />
                  Matriks Metakognisi & Diagnostik Kognitif
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <div className="text-xl font-bold text-rose-500">
                      {analysisResult.confidence_matrix.misconceptions}
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">Miskonsepsi Kritis</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Salah & Yakin Tinggi</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <div className="text-xl font-bold text-amber-500">
                      {analysisResult.confidence_matrix.regular_gaps}
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">Kesenjangan Belajar</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Salah & Ragu/Menebak</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {analysisResult.confidence_matrix.fragile}
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">Pengetahuan Rapuh</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Benar tapi Ragu</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-xl font-bold text-emerald-500">
                      {analysisResult.confidence_matrix.solid}
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">Penguasaan Kokoh</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Benar & Yakin</div>
                  </div>
                </div>
              </div>
            )}

            {/* Identified Knowledge Gaps Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg sm:text-xl font-bold">Kesenjangan Prasyarat yang Diprioritaskan</h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {analysisResult.identified_gaps.length} Titik Fokus
                </span>
              </div>

              <div className="space-y-3.5">
                {analysisResult.identified_gaps.map((gap, gIdx) => {
                  const isCritical = gap.severity === 'critical';
                  const isModerate = gap.severity === 'moderate';

                  return (
                    <div
                      key={gIdx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isCritical
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : isModerate
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-emerald-500/30 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <h3 className="font-bold text-sm sm:text-base text-foreground">
                          {gap.concept}
                        </h3>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold self-start sm:self-auto ${
                            isCritical
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : isModerate
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}
                        >
                          {isCritical && <AlertTriangle className="w-3 h-3" />}
                          {isCritical ? 'Gap Kritis (Prioritas)' : isModerate ? 'Perlu Penguatan' : 'Minor'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                        {gap.justification}
                      </p>

                      {gap.prerequisites && gap.prerequisites.length > 0 && (
                        <div className="pt-2.5 border-t border-border/40 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            Prasyarat penopang:
                          </span>
                          {gap.prerequisites.map((req, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-md text-xs font-medium bg-card border border-border text-foreground"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
              <button
                onClick={() => {
                  setStage('intro');
                  setSelectedAnswers({});
                  setCurrentIndex(0);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-border hover:bg-muted/60 text-muted-foreground flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi Pre-test
              </button>

              <button
                id="btn-build-graph"
                onClick={handleProceedToGraph}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white pijar-gradient shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer text-sm"
              >
                Buka Knowledge Graph Personal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
