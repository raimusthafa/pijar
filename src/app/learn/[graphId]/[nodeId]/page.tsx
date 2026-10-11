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
} from 'lucide-react';
import { Suspense } from 'react';
import { MOCK_MATERIAL_REKURSI } from '@/lib/ai/mock-data';
import { markNodeMastered, getMasteredNodes } from '@/lib/graph/storage';

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
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isMastered, setIsMastered] = useState<boolean>(false);

  // AI Tutor Copilot State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize topic and mastery state
  useEffect(() => {
    const paramTopic = searchParams.get('topic');
    const storedTopic = typeof window !== 'undefined' ? sessionStorage.getItem('pijar_topic') : null;
    const resolvedTopic = paramTopic || storedTopic || 'dsa';
    setTopicKey(resolvedTopic);

    const mastered = getMasteredNodes(resolvedTopic);
    if (mastered.includes(nodeId)) {
      setIsMastered(true);
      setIsQuizSubmitted(true);
    }
  }, [nodeId, searchParams]);

  // If node is rekursi, use rich mock material; otherwise generate structured concept view
  const isRekursi = nodeId.toLowerCase() === 'rekursi';
  const material = isRekursi
    ? MOCK_MATERIAL_REKURSI
    : {
        node_id: nodeId,
        title: `Konsep: ${nodeId.replace(/-/g, ' ').toUpperCase()}`,
        summary:
          'Materi pembelajaran ini dirancang untuk menutup knowledge gap prasyarat yang teridentifikasi dalam Knowledge Graph.',
        key_concepts: [
          'Memahami definisi dan karakteristik dasar konsep',
          'Mengidentifikasi relasi dan ketergantungan dengan konsep sebelumnya',
          'Penerapan praktis pada pemecahan masalah algoritma nyata',
        ],
        text_content: `## Pengantar Konsep ${nodeId.replace(/-/g, ' ')}
Konsep ini merupakan salah satu pilar utama yang harus dikuasai sebelum melangkah ke materi tingkat lanjut.
Dengan memahami prinsip dasarnya, kamu akan mampu menuntaskan kesenjangan pengetahuan yang terdeteksi pada hasil pre-test diagnostik.

### Cara Mempelajari Materi Ini:
1. Pahami bagaimana konsep ini berakar pada fondasi materi sebelumnya.
2. Perhatikan alur eksekusi pada contoh kode yang disediakan.
3. Kerjakan mini checkpoint quiz di bagian bawah untuk memvalidasi penguasaanmu.`,
        examples: [
          {
            title: `Contoh Implementasi Dasar (${nodeId})`,
            language: 'typescript',
            code: `// Contoh implementasi konseptual untuk ${nodeId}\nfunction solve(input: number): boolean {\n  // Proses logika konsep\n  return input > 0;\n}`,
            explanation: 'Logika di atas menggambarkan alur eksekusi paling sederhana dari konsep ini.',
          },
        ],
        mini_quiz: [
          {
            id: 'mq-generic',
            question: `Mengapa konsep ${nodeId.replace(/-/g, ' ')} penting dikuasai terlebih dahulu?`,
            options: [
              'Karena merupakan fondasi logika yang dibutuhkan oleh topik turunan berikutnya',
              'Hanya sekadar formalitas kurikulum',
              'Tidak memiliki dampak pada materi selanjutnya',
              'Hanya berguna untuk teori tanpa implementasi',
            ],
            correct_index: 0,
            explanation:
              'Konsep ini adalah prasyarat fundamental. Mengabaikannya akan mempersulit pemahaman materi tingkat lanjut.',
          },
        ],
      };

  const quiz = material.mini_quiz?.[0];

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Seed initial AI tutor greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Halo! Aku **Pijar AI Tutor**. Aku di sini mendampingimu memahami konsep **${material.title}**.\n\nJika ada penjelasan yang kurang jelas, analogi yang ingin kamu tanyakan, atau butuh arahan terkait checkpoint quiz, silakan tanyakan padaku kapan saja! ✨`,
        },
      ]);
    }
  }, [material.title, messages.length]);

  // Handle quiz submission with persistent mastery
  async function handleQuizSubmit() {
    if (selectedQuizOption === null || !quiz) return;
    setIsQuizSubmitted(true);

    if (selectedQuizOption === quiz.correct_index) {
      setIsMastered(true);
      await markNodeMastered(topicKey, nodeId);
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

    // Placeholder for incoming assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          nodeId,
          conceptTitle: material.title,
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
                    ? 'bg-card text-foreground shadow-sm'
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
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Mode Video
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Learning Area ──────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8 pb-24">
        {/* Title & Badge */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Remediasi Knowledge Gap
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            {material.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {material.summary}
          </p>
        </div>

        {/* Key Concepts Box */}
        <div className="p-5 rounded-2xl border border-border bg-card/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Poin-Poin Kunci yang Harus Dipahami
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs text-foreground/90">
            {material.key_concepts.map((concept, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{concept}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Content Body based on Mode */}
        {learningMode === 'text' ? (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card prose dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {material.text_content}
            </div>

            {/* Code Examples */}
            {material.examples && material.examples.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Contoh Kode:</h3>
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
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg">Kurasi Video Interaktif</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Video penjelasan visual untuk konsep ini sedang dipersiapkan. Kamu bisa beralih ke Mode Teks untuk membaca materi lengkap dan mencoba mini checkpoint quiz.
            </p>
            <button
              onClick={() => setLearningMode('text')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              Beralih ke Mode Teks
            </button>
          </div>
        )}

        {/* Mini Checkpoint Quiz */}
        {quiz && (
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              Mini Checkpoint: Uji Pemahamanmu
            </div>
            <h3 className="text-base font-bold text-foreground">{quiz.question}</h3>

            <div className="space-y-2">
              {quiz.options.map((opt, optIdx) => {
                const isSelected = selectedQuizOption === optIdx;
                const isCorrect = optIdx === quiz.correct_index;

                return (
                  <button
                    key={optIdx}
                    onClick={() => {
                      if (!isQuizSubmitted) setSelectedQuizOption(optIdx);
                    }}
                    disabled={isQuizSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center gap-3 ${
                      isQuizSubmitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300'
                          : isSelected
                          ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : 'border-border/50 opacity-60'
                        : isSelected
                        ? 'border-amber-500 bg-amber-500/10 font-semibold'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center font-bold text-[11px] shrink-0">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {!isQuizSubmitted ? (
              <button
                onClick={handleQuizSubmit}
                disabled={selectedQuizOption === null}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white pijar-gradient shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Kirim Jawaban
              </button>
            ) : (
              <div className="p-5 rounded-xl bg-card border border-border text-xs space-y-3">
                <div className="font-bold flex items-center gap-1.5">
                  {selectedQuizOption === quiz.correct_index ? (
                    <span className="text-emerald-500 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Jawaban Tepat! Knowledge gap teratasi & materi berikutnya terbuka!
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1.5 text-sm">
                      ⚠️ Belum tepat. Perhatikan penjelasan di bawah:
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {quiz.explanation}
                </p>
                <div className="pt-2 flex items-center gap-4">
                  <Link
                    href={`/graph?id=${encodeURIComponent(graphId)}&topic=${encodeURIComponent(topicKey)}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white pijar-gradient shadow-md hover:opacity-90 transition-all"
                  >
                    Kembali ke Knowledge Graph & Buka Materi Berikutnya <ChevronRight className="w-4 h-4" />
                  </Link>
                  {selectedQuizOption !== quiz.correct_index && (
                    <button
                      onClick={() => {
                        setIsQuizSubmitted(false);
                        setSelectedQuizOption(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Coba Lagi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── AI Tutor Floating Trigger ──────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          <Bot className="w-4 h-4" />
          <span>Tanya AI Tutor</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        </button>
      </div>

      {/* ── AI Tutor Slide-Over Drawer ─────────────────────── */}
      {isChatOpen && (
        <div className="fixed bottom-20 right-6 w-96 max-w-[calc(100vw-3rem)] h-[520px] bg-card border border-border rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="p-4 bg-muted/40 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">Pijar AI Tutor</h3>
                <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                  {material.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-amber-500 text-white font-medium rounded-tr-sm shadow-sm'
                      : 'bg-muted/60 text-foreground border border-border/50 rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted/60 border border-border/50 rounded-2xl p-2.5 flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>AI Tutor sedang merespons...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20 flex gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            <button
              onClick={() => handleSendMessage('💡 Berikan analogi sederhana untuk konsep ini')}
              disabled={isStreaming}
              className="shrink-0 px-2.5 py-1 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              💡 Analogi sederhana
            </button>
            <button
              onClick={() => handleSendMessage('🔍 Mengapa konsep ini prasyarat penting?')}
              disabled={isStreaming}
              className="shrink-0 px-2.5 py-1 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              🔍 Prasyarat penting
            </button>
            <button
              onClick={() => handleSendMessage('❓ Berikan petunjuk konseptual untuk checkpoint quiz')}
              disabled={isStreaming}
              className="shrink-0 px-2.5 py-1 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              ❓ Tips kuis
            </button>
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-border bg-card flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Tanya AI Tutor tentang konsep..."
              disabled={isStreaming}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isStreaming}
              className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
