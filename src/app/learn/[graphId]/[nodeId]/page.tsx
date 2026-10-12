'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Brain,
  HelpCircle,
  Lightbulb,
  Loader2,
  Bot,
  MessageSquare,
  Send,
  X,
  RotateCcw,
  AlertTriangle,
  Award,
  Zap,
  Info,
} from 'lucide-react';
import { Suspense } from 'react';
import { markNodeMastered, getMasteredNodes } from '@/lib/graph/storage';
import type { DetailedLearningMaterial, QuizEvaluationResult } from '@/lib/learn/types';
import { CURATED_MATERIALS } from '@/lib/learn/curated-materials';
import { InteractiveVideoPlayer } from '@/components/learn/InteractiveVideoPlayer';

interface LearnPageProps {
  params: Promise<{
    graphId: string;
    nodeId: string;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function LearnPage({ params }: LearnPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <LearnContent params={params} />
    </Suspense>
  );
}

function LearnContent({ params }: LearnPageProps) {
  const { graphId, nodeId } = use(params);
  const searchParams = useSearchParams();

  // Resolved topic
  const [topicKey, setTopicKey] = useState<string>('dsa');
  const [learningMode, setLearningMode] = useState<'text' | 'video'>('text');
  
  // Material state
  const [material, setMaterial] = useState<DetailedLearningMaterial | null>(null);
  const [isLoadingMaterial, setIsLoadingMaterial] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<QuizEvaluationResult | null>(null);
  const [isMastered, setIsMastered] = useState<boolean>(false);

  // AI Tutor Copilot State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize topic & load learning material
  useEffect(() => {
    let isMounted = true;
    const paramTopic = searchParams.get('topic');
    const storedTopic = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_topic') : null;
    const resolvedTopic = paramTopic || storedTopic || 'dsa';
    setTopicKey(resolvedTopic);

    // Check existing mastery
    const mastered = getMasteredNodes(resolvedTopic);
    if (mastered.includes(nodeId)) {
      setIsMastered(true);
    }

    async function fetchMaterial() {
      setIsLoadingMaterial(true);
      setLoadError(null);

      // Fast path: Check curated material in memory first
      if (CURATED_MATERIALS[nodeId]) {
        if (isMounted) {
          setMaterial(CURATED_MATERIALS[nodeId]);
          setIsLoadingMaterial(false);
        }
        return;
      }

      // Dynamic path: Call API generator
      try {
        const res = await fetch('/api/learn/material', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: resolvedTopic,
            nodeId,
            graphId,
          }),
        });

        const data = await res.json();
        if (data.success && data.material) {
          if (isMounted) {
            setMaterial(data.material);
          }
        } else {
          throw new Error(data.error || 'Gagal memuat materi');
        }
      } catch (err: unknown) {
        console.warn('Failed to fetch dynamic material, using curated fallback:', err);
        if (isMounted) {
          // If all else fails, use fallback rekursi or generic
          const fallback = CURATED_MATERIALS['rekursi'];
          setMaterial({
            ...fallback,
            nodeId,
            title: `Konsep: ${nodeId.replace(/-/g, ' ').toUpperCase()}`,
          });
        }
      } finally {
        if (isMounted) setIsLoadingMaterial(false);
      }
    }

    fetchMaterial();

    return () => {
      isMounted = false;
    };
  }, [nodeId, graphId, searchParams]);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Seed initial AI tutor greeting
  useEffect(() => {
    if (material && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Halo! Aku **Pijar AI Tutor**. Aku siap mendampingimu mempelajari konsep **${material.title}**.\n\nJika ada bagian teori yang ingin kamu tanyakan analoginya, butuh arahan terkait contoh kode, atau ingin berdiskusi seputar kuis checkpoint, silakan tanyakan kapan saja! ✨`,
        },
      ]);
    }
  }, [material, messages.length]);

  // Handle multi-question quiz selection
  function handleSelectQuizOption(questionId: string, optionIndex: number) {
    if (quizResult?.isPassed) return; // Prevent changing after passed
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  }

  // Handle quiz submission with server-side grading & cognitive misconception feedback
  async function handleQuizSubmit() {
    if (!material || !material.checkpointQuestions || material.checkpointQuestions.length === 0) return;
    setIsSubmittingQuiz(true);

    try {
      const res = await fetch('/api/learn/evaluate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicKey,
          nodeId,
          graphId,
          answers: selectedAnswers,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setQuizResult(data.result);
        if (data.result.isPassed) {
          setIsMastered(true);
          await markNodeMastered(topicKey, nodeId);
        }
      } else {
        throw new Error(data.error || 'Evaluasi kuis gagal');
      }
    } catch (err) {
      console.error('Quiz evaluation error:', err);
      alert('Terjadi kendala saat mengevaluasi kuis. Silakan coba kembali.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  // Handle AI Tutor Chat Streaming
  async function handleSendMessage(presetText?: string) {
    const textToSend = presetText ?? inputMessage.trim();
    if (!textToSend || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsStreaming(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          nodeId,
          conceptTitle: material?.title || nodeId,
          topic: topicKey,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Gagal menghubungi AI Tutor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages(prev => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
            next[lastIdx] = { ...next[lastIdx], content: accumulated };
          }
          return next;
        });
      }
    } catch (err: unknown) {
      console.warn('Chat error:', err);
      setMessages(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
          next[lastIdx] = {
            role: 'assistant',
            content: `Maaf, terjadi kendala saat merespons. Namun jangan ragu untuk meninjau poin-poin penting materi di atas!`,
          };
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  if (isLoadingMaterial || !material) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            Menyiapkan Materi & Eksplanasi Visual...
          </p>
          <p className="text-xs text-muted-foreground">
            Menyelaraskan kurikulum dengan Knowledge Graph personalmu
          </p>
        </div>
      </div>
    );
  }

  const questions = material.checkpointQuestions || [];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = questions.length > 0 && answeredCount >= questions.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href={`/graph?id=${encodeURIComponent(graphId)}&topic=${encodeURIComponent(topicKey)}`}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Knowledge Graph</span>
          </Link>

          <div className="flex items-center gap-3">
            {isMastered && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Konsep Dikuasai
              </span>
            )}

            {/* Mode Toggle (Text vs Video) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-semibold">
              <button
                onClick={() => setLearningMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  learningMode === 'text'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Mode Teks
              </button>
              <button
                onClick={() => setLearningMode('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  learningMode === 'video'
                    ? 'bg-card text-foreground shadow-sm font-bold text-amber-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Mode Video Interaktif
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Learning Area ──────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8 pb-28">
        {/* Title, Badge & Objectives */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Remediasi Knowledge Gap
            </span>
            <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted border border-border/40 font-mono">
              ID: {material.nodeId}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            {material.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {material.summary}
          </p>
        </div>

        {/* Learning Objective Box */}
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 text-xs leading-relaxed">
          <Brain className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground font-semibold">Tujuan Pembelajaran: </strong>
            <span className="text-muted-foreground">{material.learningObjective}</span>
          </div>
        </div>

        {/* ── Content View: Video vs Text ────────────────────── */}
        {learningMode === 'video' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <Video className="w-4 h-4 text-amber-500" />
                Video Pembelajaran Visual Interaktif
              </span>
              <span>Didukung Animasi Real-time & Narasi Suara</span>
            </div>

            <InteractiveVideoPlayer
              script={material.videoScript}
              onFinished={() => {
                // Auto-prompt to take checkpoint quiz
              }}
            />

            <div className="p-4 rounded-2xl bg-card border border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>Ingin membaca penjelasan tertulis secara lebih detail?</span>
              <button
                onClick={() => setLearningMode('text')}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
              >
                Beralih ke Mode Teks →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analogy Box */}
            {material.analogy && (
              <div className="p-5 rounded-2xl border border-border bg-card/80">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Analogi Dunia Nyata
                </h2>
                <p className="text-sm text-foreground/90 leading-relaxed italic">
                  "{material.analogy}"
                </p>
              </div>
            )}

            {/* Conceptual Explanation Markdown */}
            <div className="p-6 rounded-2xl border border-border bg-card prose dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {material.conceptExplanation}
            </div>

            {/* Key Definitions */}
            {material.keyDefinitions && material.keyDefinitions.length > 0 && (
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  Istilah & Definisi Kunci
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {material.keyDefinitions.map((def, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                      <div className="font-bold text-foreground mb-1">{def.term}</div>
                      <div className="text-muted-foreground leading-relaxed">{def.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Code Examples */}
            {material.examples && material.examples.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Contoh Implementasi Konsep:</h3>
                {material.examples.map((ex, exIdx) => (
                  <div key={exIdx} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{ex.title}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{ex.language}</span>
                    </div>
                    <pre className="p-4 bg-muted/20 text-xs font-mono overflow-x-auto text-foreground">
                      <code>{ex.code}</code>
                    </pre>
                    <div className="p-3 bg-muted/10 border-t border-border/40 text-xs text-muted-foreground">
                      💡 {ex.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Common Misconceptions */}
            {material.commonMisconceptions && material.commonMisconceptions.length > 0 && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Miskonsepsi Umum yang Sering Terjadi
                </h3>
                {material.commonMisconceptions.map((item, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="font-semibold text-foreground">
                      ❌ Salah Paham: <span className="text-rose-600 dark:text-rose-400">{item.misconception}</span>
                    </div>
                    <div className="text-muted-foreground">
                      ✅ Pelurusan Logika: {item.correction}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Key Takeaways */}
            {material.keyTakeaways && material.keyTakeaways.length > 0 && (
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Poin-Poin Penting untuk Diingat
                </h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-foreground/90">
                  {material.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Multi-Question Checkpoint Quiz ──────────────────── */}
        {questions.length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" />
                Mini Checkpoint: Validasi Penguasaan Konsep
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {answeredCount} dari {questions.length} terjawab
              </span>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIndex) => {
                const selectedOpt = selectedAnswers[q.id];
                const qEval = quizResult?.questionResults.find(r => r.questionId === q.id);

                return (
                  <div key={q.id} className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {qIndex + 1}
                      </span>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {q.question}
                      </h4>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {q.options.map((optionText, optIdx) => {
                        const isChosen = selectedOpt === optIdx;
                        const isSubmitted = Boolean(quizResult);
                        const isCorrectOption = qEval?.correctIndex === optIdx;

                        let optionStyle = 'border-border/70 bg-card hover:bg-muted/40 text-foreground';

                        if (isSubmitted) {
                          if (isCorrectOption) {
                            optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold';
                          } else if (isChosen && !qEval?.isCorrect) {
                            optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300';
                          } else {
                            optionStyle = 'border-border/40 bg-muted/20 text-muted-foreground opacity-60';
                          }
                        } else if (isChosen) {
                          optionStyle = 'border-amber-500 bg-amber-500/15 text-foreground font-semibold';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={quizResult?.isPassed}
                            onClick={() => handleSelectQuizOption(q.id, optIdx)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs transition-all ${optionStyle}`}
                          >
                            <span className="flex-1 pr-2">{optionText}</span>
                            {isSubmitted && isCorrectOption && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            {isSubmitted && isChosen && !qEval?.isCorrect && (
                              <X className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Cognitive Misconception Feedback (F7) */}
                    {qEval && !qEval.isCorrect && qEval.misconceptionFeedback && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                        <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Analisis Kognitif Miskonsepsi:
                        </div>
                        <p className="text-foreground/90 leading-relaxed">
                          {qEval.misconceptionFeedback}
                        </p>
                      </div>
                    )}

                    {/* Correct Explanation */}
                    {qEval && qEval.isCorrect && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300">
                        ✅ <strong>Tepat sekali!</strong> {qEval.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiz Submit Button & Overall Feedback */}
            <div className="space-y-4 pt-2">
              {!quizResult?.isPassed && (
                <button
                  disabled={!isAllAnswered || isSubmittingQuiz}
                  onClick={handleQuizSubmit}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white pijar-gradient shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingQuiz ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengevaluasi Pemahaman & Miskonsepsi...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Kirim & Periksa Jawaban ({answeredCount}/{questions.length})
                    </>
                  )}
                </button>
              )}

              {/* Evaluation Summary Card */}
              {quizResult && (
                <div
                  className={`p-5 rounded-2xl border text-xs sm:text-sm space-y-3 ${
                    quizResult.isPassed
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-500/15 border-amber-500/40 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2 text-base">
                      {quizResult.isPassed ? (
                        <>
                          <Award className="w-5 h-5 text-emerald-500" />
                          Selamat! Konsep Berhasil Dikuasai
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-5 h-5 text-amber-500" />
                          Perlu Sedikit Pemantapan Lagi
                        </>
                      )}
                    </span>
                    <span className="text-base font-mono font-extrabold px-3 py-1 rounded-xl bg-card border">
                      Skor: {quizResult.score}%
                    </span>
                  </div>

                  <p className="leading-relaxed text-xs sm:text-sm">
                    {quizResult.summaryFeedback}
                  </p>

                  {/* Link to Knowledge Graph on Mastery */}
                  {quizResult.isPassed && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <Link
                        href={`/graph?id=${encodeURIComponent(graphId)}&topic=${encodeURIComponent(topicKey)}`}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        Lihat Knowledge Graph yang Terbuka
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ── AI Learning Copilot Chat Widget (F6) ───────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border shadow-2xl hover:border-amber-400 hover:scale-105 transition-all text-xs font-bold group"
          >
            <div className="w-7 h-7 rounded-lg pijar-gradient flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <span>Tanya AI Tutor</span>
          </button>
        ) : (
          <div className="w-[360px] sm:w-[400px] h-[520px] rounded-3xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg pijar-gradient flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Pijar AI Tutor</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                    Konteks: {material.title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                        : 'bg-muted/70 text-foreground border border-border/50 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="p-2.5 rounded-2xl bg-muted/70 border border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>AI Tutor sedang mengetik...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preset Questions */}
            <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => handleSendMessage('Bisa berikan contoh analogi sederhana untuk konsep ini?')}
                className="px-2.5 py-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground shrink-0"
              >
                💡 Minta Analogi
              </button>
              <button
                onClick={() => handleSendMessage('Mengapa konsep ini menjadi prasyarat materi selanjutnya?')}
                className="px-2.5 py-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground shrink-0"
              >
                🔗 Mengapa Prasyarat?
              </button>
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-border bg-card flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tanyakan kebingunganmu..."
                className="flex-1 bg-muted/60 border border-border/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                disabled={!inputMessage.trim() || isStreaming}
                onClick={() => handleSendMessage()}
                className="p-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
