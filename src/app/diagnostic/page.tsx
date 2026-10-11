'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BrainCircuit,
  Loader2,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Target,
  Clock,
  Layers,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import type { DiagnosticQuestion, DiagnosticResult, KnowledgeGap } from '@/types';

import { Suspense } from 'react';

// Topic display names
const TOPIC_NAMES: Record<string, string> = {
  dsa: 'Struktur Data & Algoritma',
  ml: 'Machine Learning',
  math: 'Matematika Diskrit',
  db: 'Database & SQL',
  web: 'Web Development',
  stats: 'Statistik & Probabilitas',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function DiagnosticPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Memuat modul diagnostik...</p>
        </div>
      </div>
    }>
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
  const [stage, setStage] = useState<'intro' | 'quiz' | 'analyzing' | 'result'>('intro');

  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DiagnosticResult | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState<string>('Mengevaluasi penalaran konseptual...');

  // Initialize topic from URL param or sessionStorage
  useEffect(() => {
    const paramTopic = searchParams.get('topic');
    const storedTopic = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_topic') : null;
    const finalKey = paramTopic || storedTopic || 'dsa';
    setTopicKey(finalKey);
    setTopicName(TOPIC_NAMES[finalKey] || finalKey);
  }, [searchParams]);

  // Start Diagnostic: Fetch Questions
  async function handleStartQuiz() {
    setLoadingQuestions(true);
    try {
      const storedGoal = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_goal') : 'Persiapan Komprehensif';
      const res = await fetch('/api/diagnostic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          target_goal: storedGoal,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setStage('quiz');
      } else {
        throw new Error(data.error || 'Gagal memuat pertanyaan');
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

  // Finish and trigger AI gap detection
  async function handleFinishAndAnalyze() {
    setStage('analyzing');

    // Simulated status updates for engaging AI feedback feel
    const timer1 = setTimeout(() => {
      setAnalyzingStep('Mendeteksi pola kesalahpahaman (misconceptions)...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setAnalyzingStep('Memetakan ketergantungan konsep prasyarat (prerequisites)...');
    }, 2400);

    const timer3 = setTimeout(() => {
      setAnalyzingStep('Menyusun arsitektur Knowledge Graph personal...');
    }, 3600);

    try {
      const payloadAnswers = questions.map((q, idx) => ({
        question_id: q.id,
        question: q.question,
        options: q.options,
        selected_option: selectedAnswers[idx] ?? -1,
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
          answers: payloadAnswers,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setAnalysisResult(data.result);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pijar_diagnostic_result', JSON.stringify(data.result));
          document.cookie = `pijar_active_topic=${encodeURIComponent(topicName)}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `pijar_active_topic_key=${encodeURIComponent(topicKey)}; path=/; max-age=604800; SameSite=Lax`;
        }
        setStage('result');
      } else {
        throw new Error(data.error || 'Analisis gagal');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Gagal menganalisis jawaban. Menampilkan hasil diagnosa standar.');
      setStage('result');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    }
  }

  // Proceed to Knowledge Graph
  function handleProceedToGraph() {
    router.push(`/graph?topic=${encodeURIComponent(topicKey)}`);
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
            <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center transition-transform group-hover:scale-105">
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
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col justify-center">

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
              Pijar akan menyajikan <span className="text-foreground font-semibold">5 pertanyaan terarah</span> untuk topik <span className="text-amber-500 font-semibold">{topicName}</span>. Tes ini bukan untuk menguji kelulusan, melainkan mendeteksi <span className="text-foreground font-semibold">konsep prasyarat</span> yang belum dikuasai agar kurikulum belajarmu tepat sasaran.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
              <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-amber-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Cepat & Terarah</h3>
                <p className="text-xs text-muted-foreground">Hanya membutuhkan sekitar 3–5 menit tanpa beban nilai.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
                <ShieldAlert className="w-5 h-5 text-rose-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Deteksi Prasyarat</h3>
                <p className="text-xs text-muted-foreground">Menemukan akar ketidaktahuan sebelum materi lanjutan.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
                <Layers className="w-5 h-5 text-amber-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Knowledge Graph</h3>
                <p className="text-xs text-muted-foreground">Hasil diagnosis otomatis menjadi peta kurikulum visual.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="btn-start-diagnostic"
                onClick={handleStartQuiz}
                disabled={loadingQuestions}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white pijar-gradient shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loadingQuestions ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyiapkan Soal Diagnostik...
                  </>
                ) : (
                  <>
                    Mulai Diagnostik
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium border border-border hover:bg-muted/50 transition-colors text-muted-foreground text-center"
              >
                Nanti Saja
              </Link>
            </div>
          </div>
        )}

        {/* ════════ STAGE 2: ACTIVE QUIZ ════════ */}
        {stage === 'quiz' && currentQ && (
          <div className="max-w-2xl mx-auto w-full py-2">
            {/* Progress Bar & Header */}
            <div className="mb-8">
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

              {/* Concept badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4">
                <Target className="w-3.5 h-3.5" />
                Fokus Uji: {currentQ.concept_tested}
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-bold mb-6 text-foreground leading-snug">
                {currentQ.question}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      id={`option-${currentIndex}-${optIdx}`}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 group cursor-pointer ${
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
                      <span className={`text-sm sm:text-base leading-relaxed pt-0.5 ${
                        isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevQuestion}
                disabled={currentIndex === 0}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border border-border flex items-center gap-2 transition-colors ${
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
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                  isAnswered
                    ? 'pijar-gradient text-white shadow-md shadow-amber-500/20 hover:scale-[1.02] cursor-pointer'
                    : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
              >
                {currentIndex === questions.length - 1 ? (
                  <>
                    Analisis Jawaban AI
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
              <div className="relative w-full h-full rounded-full border-2 border-amber-500/30 flex items-center justify-center glass">
                <BrainCircuit className="w-10 h-10 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Menganalisis Diagnostik...</h2>
            <p className="text-amber-500 text-sm font-medium animate-pulse mb-6">
              {analyzingStep}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              AI Pijar sedang mengonstruksi peta konsep prasyarat berdasarkan pola jawabanmu.
            </p>
          </div>
        )}

        {/* ════════ STAGE 4: RESULTS & GAP ANALYSIS ════════ */}
        {stage === 'result' && analysisResult && (
          <div className="max-w-3xl mx-auto w-full py-4 space-y-8 animate-fade-in">
            {/* Top Stat Banner */}
            <div className="p-6 sm:p-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Laporan Diagnostik Selesai
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                    Pemetaan Knowledge Gap: {analysisResult.topic}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                    {analysisResult.summary_narrative}
                  </p>
                </div>

                <div className="shrink-0 p-4 rounded-xl bg-card border border-border text-center min-w-[120px]">
                  <span className="text-3xl font-extrabold text-amber-500">
                    {analysisResult.correct_count}
                    <span className="text-base text-muted-foreground font-normal"> / {analysisResult.total_questions}</span>
                  </span>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">
                    Soal Dikuasai
                  </div>
                </div>
              </div>
            </div>

            {/* Identified Knowledge Gaps Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold">Kesenjangan Pengetahuan Terdeteksi</h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {analysisResult.identified_gaps.length} Kesenjangan
                </span>
              </div>

              <div className="space-y-4">
                {analysisResult.identified_gaps.map((gap, gIdx) => {
                  const isCritical = gap.severity === 'critical';
                  const isModerate = gap.severity === 'moderate';

                  return (
                    <div
                      key={gIdx}
                      className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                        isCritical
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : isModerate
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-emerald-500/30 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-base sm:text-lg text-foreground">
                            {gap.concept}
                          </h3>
                        </div>

                        {/* Severity Badge */}
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
                          {isCritical ? 'Gap Kritis (Prasyarat)' : isModerate ? 'Perlu Penguatan' : 'Minor'}
                        </span>
                      </div>

                      {/* Justification */}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {gap.justification}
                      </p>

                      {/* Prerequisites Pills */}
                      {gap.prerequisites && gap.prerequisites.length > 0 && (
                        <div className="pt-3 border-t border-border/40 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Prasyarat yang perlu dituntaskan:
                          </span>
                          {gap.prerequisites.map((req, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-card border border-border text-foreground"
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
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted/60 text-muted-foreground flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi Pre-test
              </button>

              <button
                id="btn-build-graph"
                onClick={handleProceedToGraph}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white pijar-gradient shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                Bangun Knowledge Graph Pribadi
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
