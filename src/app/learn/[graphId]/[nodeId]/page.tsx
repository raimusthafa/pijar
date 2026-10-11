'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { Suspense } from 'react';
import { MOCK_MATERIAL_REKURSI } from '@/lib/ai/mock-data';

interface LearnPageProps {
  params: Promise<{
    graphId: string;
    nodeId: string;
  }>;
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
  const [learningMode, setLearningMode] = useState<'text' | 'video'>('text');
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);

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
Dengan memahami prinsip dasarnya, kamu akan mampu menuntaskan kesenjangan pengetahuan yang terdeteksi pada hasil pre-test diagnostik.`,
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
              'Konsep ini adalah prasyarat fundamental. Mengabaikannya akan mempersulit pemahaman algoritma tingkat lanjut.',
          },
        ],
      };

  const quiz = material.mini_quiz?.[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href={`/graph?id=${encodeURIComponent(graphId)}`}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Knowledge Graph</span>
          </Link>

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
      </header>

      {/* ── Main Learning Area ──────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
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
              Video penjelasan visual untuk konsep ini sedang dipersiapkan untuk demonstrasi. Kamu bisa beralih ke Mode Teks untuk membaca materi lengkap dan mencoba kuis pemahaman.
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
                onClick={() => setIsQuizSubmitted(true)}
                disabled={selectedQuizOption === null}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white pijar-gradient shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Kirim Jawaban
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-card border border-border text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  {selectedQuizOption === quiz.correct_index ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Jawaban Tepat! Knowledge gap teratasi.
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1">
                      ⚠️ Belum tepat. Perhatikan penjelasan di bawah:
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {quiz.explanation}
                </p>
                <div className="pt-2">
                  <Link
                    href={`/graph?id=${encodeURIComponent(graphId)}`}
                    className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                  >
                    Kembali ke Peta Graf & Lanjutkan Materi Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
