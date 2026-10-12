'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Code2,
  BrainCircuit,
  Calculator,
  Database,
  Globe,
  TrendingUp,
  ShieldAlert,
  Cloud,
  PenTool,
  Zap,
  Target,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Curated Topic Recommendations ─────────────────────────────
const CURATED_TOPICS = [
  { id: 'dsa',   label: 'Struktur Data & Algoritma', icon: <Code2 className="w-5 h-5" />,         desc: 'Array, Graph, Dynamic Programming' },
  { id: 'ml',    label: 'Machine Learning & AI',      icon: <BrainCircuit className="w-5 h-5" />,   desc: 'Supervised, Transformers, LLM' },
  { id: 'web',   label: 'Web & Fullstack Dev',        icon: <Globe className="w-5 h-5" />,          desc: 'React, Next.js, Node.js, API' },
  { id: 'db',    label: 'Database & SQL Architecture',icon: <Database className="w-5 h-5" />,       desc: 'Relational, Indexing, ACID, NoSQL' },
  { id: 'devops',label: 'DevOps & Cloud Systems',     icon: <Cloud className="w-5 h-5" />,          desc: 'Docker, Kubernetes, CI/CD, Terraform' },
  { id: 'cyber', label: 'Cybersecurity & Security',   icon: <ShieldAlert className="w-5 h-5" />,    desc: 'Web Pentest, Cryptography, OWASP' },
  { id: 'math',  label: 'Matematika Diskrit',         icon: <Calculator className="w-5 h-5" />,     desc: 'Logika, Graf, Kombinatorik' },
  { id: 'stats', label: 'Statistik & Probabilitas',  icon: <TrendingUp className="w-5 h-5" />,     desc: 'Distribusi, Inferensi, Bayes' },
];

const GOALS = [
  { id: 'beginner',   label: 'Pemula (Fondasi Baru)',       desc: 'Membangun model mental dan konsep dasar dari nol' },
  { id: 'interview',  label: 'Persiapan Teknis & Interview', desc: 'Bedah studi kasus, pemecahan masalah, dan trade-off' },
  { id: 'deepen',     label: 'Pendalaman Arsitektur Mahir', desc: 'Menyelami mekanisme internal dan optimalisasi performa' },
  { id: 'exam',       label: 'Persiapan Ujian / Akademik',  desc: 'Penyelarasan kurikulum akademik dan sertifikasi' },
];

const DIAGNOSTIC_MODES = [
  {
    id: 'quick',
    count: 5,
    title: 'Diagnostik Cepat (5 Soal)',
    desc: 'Deteksi cepat konsep prasyarat inti (~3 menit)',
    icon: <Zap className="w-4 h-4 text-amber-500" />,
  },
  {
    id: 'comprehensive',
    count: 10,
    title: 'Diagnostik Komprehensif (10 Soal)',
    desc: 'Evaluasi berjenjang: fondasi, mekanika, dan studi kasus arsitektur (~7 menit)',
    icon: <Target className="w-4 h-4 text-blue-500" />,
  },
];

const STYLES = [
  {
    id: 'text',
    label: 'Struktur Teks & Kode',
    desc: 'Penjelasan sistematis, analisis kode, dan visualisasi diagram konsep',
    emoji: '📖',
  },
  {
    id: 'video',
    label: 'Visual Interaktif',
    desc: 'Panduan video edukatif dengan adegan animasi dan catatan penting',
    emoji: '🎬',
  },
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]                         = useState(1);
  const [topicKey, setTopicKey]                 = useState('dsa');
  const [customTopic, setCustomTopic]           = useState('');
  const [goal, setGoal]                         = useState('interview');
  const [diagnosticCount, setDiagnosticCount]   = useState<number>(5);
  const [style, setStyle]                       = useState('text');
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');

  // Resolved display topic
  const activeTopicDisplay = customTopic.trim()
    ? customTopic.trim()
    : (CURATED_TOPICS.find(t => t.id === topicKey)?.label || 'Struktur Data & Algoritma');

  const canNext = step === 1 
    ? (!!topicKey || !!customTopic.trim()) 
    : step === 2 
    ? (!!goal && !!diagnosticCount) 
    : !!style;

  function handleSelectCurated(id: string) {
    setTopicKey(id);
    setCustomTopic('');
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
  }

  async function handleFinish() {
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: user.user_metadata?.full_name ?? '',
            learning_style: style,
            target_goal: goal,
            updated_at: new Date().toISOString(),
          });
      }
    } catch {
      // In demo mode or offline dev, ignore supabase error
    }

    // Store chosen parameters
    sessionStorage.setItem('pijar_topic', activeTopicDisplay);
    sessionStorage.setItem('pijar_topic_key', customTopic.trim() ? 'custom' : topicKey);
    sessionStorage.setItem('pijar_goal', goal);
    sessionStorage.setItem('pijar_diagnostic_count', diagnosticCount.toString());
    sessionStorage.setItem('pijar_style', style);

    if (typeof document !== 'undefined') {
      document.cookie = `pijar_active_topic=${encodeURIComponent(activeTopicDisplay)}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `pijar_active_topic_key=${encodeURIComponent(customTopic.trim() ? 'custom' : topicKey)}; path=/; max-age=604800; SameSite=Lax`;
    }

    router.push(`/diagnostic?topic=${encodeURIComponent(activeTopicDisplay)}&count=${diagnosticCount}`);
  }

  return (
    <div className="min-h-screen pijar-gradient-hero flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pijar</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground font-medium">Langkah {step} dari {TOTAL_STEPS}</span>
          <span className="ml-auto text-xs text-muted-foreground font-semibold">
            {step === 1 ? 'Pilih Topik Belajar' : step === 2 ? 'Tujuan & Mode Diagnostik' : 'Preferensi Format'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full pijar-gradient rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl glass rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/80">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: Topic Selection (Curated + Custom Freeform) ── */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Bidang apa yang ingin kamu kuasai?</h1>
            <p className="text-muted-foreground text-sm mb-5">
              Pilih dari bidang populer atau ketik topik spesifik apa pun.
            </p>

            {/* Custom Input */}
            <div className="mb-5 p-3.5 rounded-2xl border border-border/80 bg-background/70 backdrop-blur-sm">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-amber-500" />
                Punya topik spesifik impianmu? Tulis di sini:
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value.trim()) setTopicKey('');
                }}
                placeholder="Misal: Rust Concurrency, Microservices Event-Driven, Kriptografi..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="text-xs font-semibold text-muted-foreground mb-2.5">
              Atau pilih katalog kurasi:
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {CURATED_TOPICS.map((t) => {
                const isSelected = !customTopic.trim() && topicKey === t.id;
                return (
                  <button
                    key={t.id}
                    id={`topic-${t.id}`}
                    onClick={() => handleSelectCurated(t.id)}
                    className={`flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 text-left transition-all hover:shadow-md relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : 'border-border bg-background/60 hover:border-amber-500/40'
                    }`}
                  >
                    <div className={`${isSelected ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {t.icon}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold leading-tight">{t.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.desc}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-amber-500 absolute top-2.5 right-2.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Goal & Diagnostic Mode ── */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Tujuan & Kedalaman Diagnostik</h1>
            <p className="text-muted-foreground text-sm mb-5">
              Pijar menyesuaikan asesmen untuk topik: <strong className="text-foreground">{activeTopicDisplay}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Sasaran Belajar:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GOALS.map((g) => {
                    const isSelected = goal === g.id;
                    return (
                      <button
                        key={g.id}
                        id={`goal-${g.id}`}
                        onClick={() => setGoal(g.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-border bg-background/60 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="font-semibold text-xs leading-tight">{g.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Pilih Format Diagnostik Pre-Test:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DIAGNOSTIC_MODES.map((dm) => {
                    const isSelected = diagnosticCount === dm.count;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => setDiagnosticCount(dm.count)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-border bg-background/60 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            {dm.icon}
                            {dm.title}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{dm.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Learning Style ── */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Format Belajar Pilihan</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Pilih cara penyampaian materi konsep yang paling nyaman untukmu
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              {STYLES.map((s) => {
                const isSelected = style === s.id;
                return (
                  <button
                    key={s.id}
                    id={`style-${s.id}`}
                    onClick={() => setStyle(s.id)}
                    className={`flex flex-col items-center text-center gap-2.5 p-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border bg-background/60 hover:border-amber-500/30'
                    }`}
                  >
                    <span className="text-3xl">{s.emoji}</span>
                    <div>
                      <div className="font-semibold text-xs sm:text-sm">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.desc}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/50">
          <button
            id="onboarding-back"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          {step < TOTAL_STEPS ? (
            <button
              id="onboarding-next"
              onClick={handleNext}
              disabled={!canNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-xs sm:text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              Lanjut <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="onboarding-finish"
              onClick={handleFinish}
              disabled={!canNext || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-xs sm:text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan Diagnostik...
                </>
              ) : (
                <>
                  Mulai Diagnostik ({diagnosticCount} Soal) <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Kurikulum Pijar didukung Knowledge Graph adaptif tanpa template statis.
      </p>
    </div>
  );
}
