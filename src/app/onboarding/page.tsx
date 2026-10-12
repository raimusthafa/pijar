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
  MessageSquareHeart,
  Lightbulb,
  Award,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { CognitiveIntakeResult } from '@/types';

// ── Curated Topic Recommendations ─────────────────────────────
const CURATED_TOPICS = [
  { id: 'cyber', label: 'Cybersecurity & Security',   icon: <ShieldAlert className="w-5 h-5" />,    desc: 'Web Pentest, Cryptography, OWASP' },
  { id: 'dsa',   label: 'Struktur Data & Algoritma', icon: <Code2 className="w-5 h-5" />,         desc: 'Array, Graph, Dynamic Programming' },
  { id: 'ml',    label: 'Machine Learning & AI',      icon: <BrainCircuit className="w-5 h-5" />,   desc: 'Supervised, Transformers, LLM' },
  { id: 'web',   label: 'Web & Fullstack Dev',        icon: <Globe className="w-5 h-5" />,          desc: 'React, Next.js, Node.js, API' },
  { id: 'db',    label: 'Database & SQL Architecture',icon: <Database className="w-5 h-5" />,       desc: 'Relational, Indexing, ACID, NoSQL' },
  { id: 'devops',label: 'DevOps & Cloud Systems',     icon: <Cloud className="w-5 h-5" />,          desc: 'Docker, Kubernetes, CI/CD, Terraform' },
  { id: 'math',  label: 'Matematika Diskrit',         icon: <Calculator className="w-5 h-5" />,     desc: 'Logika, Graf, Kombinatorik' },
  { id: 'stats', label: 'Statistik & Probabilitas',  icon: <TrendingUp className="w-5 h-5" />,     desc: 'Distribusi, Inferensi, Bayes' },
];

const GOALS = [
  { id: 'beginner',      label: 'Pemula (Fondasi Baru)',            desc: 'Membangun model mental dan konsep dasar dari nol' },
  { id: 'practitioner',  label: 'Praktisi Mahir (Industry-Grade)',  desc: 'Studi kasus arsitektur produksi, eksploitasi, dan pengujian mendalam' },
  { id: 'interview',     label: 'Persiapan Teknis & Interview',     desc: 'Bedah studi kasus, pemecahan masalah, dan trade-off' },
  { id: 'deepen',        label: 'Pendalaman Arsitektur Sistem',     desc: 'Menyelami mekanisme internal dan optimalisasi performa' },
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
  const [intakeTab, setIntakeTab]               = useState<'counselor' | 'catalog'>('counselor');
  const [counselorText, setCounselorText]       = useState('');
  const [analyzingIntake, setAnalyzingIntake]   = useState(false);
  const [intakeResult, setIntakeResult]         = useState<CognitiveIntakeResult | null>(null);

  const [topicKey, setTopicKey]                 = useState('');
  const [customTopic, setCustomTopic]           = useState('');
  const [goal, setGoal]                         = useState('beginner');
  const [diagnosticCount, setDiagnosticCount]   = useState<number>(5);
  const [style, setStyle]                       = useState('text');
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');

  // Resolved display topic
  const activeTopicDisplay = intakeResult
    ? intakeResult.canonical_topic
    : customTopic.trim()
    ? customTopic.trim()
    : (CURATED_TOPICS.find(t => t.id === topicKey)?.label || 'Struktur Data & Algoritma');

  const canNext = step === 1 
    ? (!!intakeResult || !!topicKey || !!customTopic.trim()) 
    : step === 2 
    ? (!!goal && !!diagnosticCount) 
    : !!style;

  // Handle AI Counselor Analysis
  async function handleAnalyzeCounselorText() {
    if (!counselorText.trim()) return;
    setAnalyzingIntake(true);
    setError('');

    try {
      const res = await fetch('/api/intake/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: counselorText.trim() }),
      });

      const data = await res.json();
      if (data.success && data.intake) {
        setIntakeResult(data.intake);
        setCustomTopic(data.intake.canonical_topic);
        setTopicKey('');
        // Calibrate goal
        if (data.intake.is_practitioner_track) {
          setGoal('practitioner');
          setDiagnosticCount(10);
        } else if (data.intake.detected_level === 'absolute_beginner') {
          setGoal('beginner');
        }
      } else {
        throw new Error(data.error || 'Gagal menganalisis input keluh kesah');
      }
    } catch (err: any) {
      console.error('Intake analysis failed:', err);
      // Resilient local fallback
      const clean = counselorText.trim();
      const isCyber = clean.toLowerCase().includes('cyber') || clean.toLowerCase().includes('security');
      const isPractitioner = clean.toLowerCase().includes('mahir') || clean.toLowerCase().includes('praktisi');
      const fallbackTopic = isCyber ? (isPractitioner ? 'Cybersecurity (Jalur Praktisi Mahir)' : 'Cybersecurity Fundamentals') : clean;
      
      const localFallback: CognitiveIntakeResult = {
        raw_input: clean,
        canonical_topic: fallbackTopic,
        domain_category: isCyber ? 'Keamanan Informasi & Jaringan' : 'Teknologi & Komputer',
        detected_level: isPractitioner ? 'advanced_practitioner' : 'absolute_beginner',
        target_ambition: isPractitioner ? 'master_practitioner' : 'foundational_clarity',
        is_practitioner_track: isPractitioner,
        pain_points: [
          'Roadmap Paralysis (Kebingungan Menentukan Titik Awal)',
          'Keterbatasan Sumber Belajar Terkurasi',
        ],
        empathy_mentor_note: isPractitioner
          ? 'Ambisi yang hebat! Kurikulum Pijar telah dikalibrasi untuk studi kasus tingkat industri.'
          : 'Sangat wajar merasa bingung di awal. Pijar telah menyusun materi langkah demi langkah tanpa perlu mencari sumber luar.',
        recommended_diagnostic_focus: ['Fondasi Konseptual', 'Mekanisme Eksekusi'],
        target_goal: isPractitioner ? 'Praktisi Mahir' : 'Fondasi Baru dari Nol',
      };
      setIntakeResult(localFallback);
      setCustomTopic(localFallback.canonical_topic);
    } finally {
      setAnalyzingIntake(false);
    }
  }

  function handleSelectCurated(id: string) {
    setTopicKey(id);
    setCustomTopic('');
    setIntakeResult(null);
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
    sessionStorage.setItem('pijar_topic_key', intakeResult ? 'custom' : customTopic.trim() ? 'custom' : topicKey);
    sessionStorage.setItem('pijar_goal', goal);
    sessionStorage.setItem('pijar_diagnostic_count', diagnosticCount.toString());
    sessionStorage.setItem('pijar_style', style);
    if (intakeResult) {
      sessionStorage.setItem('pijar_intake_context', JSON.stringify(intakeResult));
    }

    const isPractitioner = intakeResult?.is_practitioner_track || goal === 'practitioner';
    sessionStorage.setItem('pijar_is_practitioner', isPractitioner ? 'true' : 'false');

    if (typeof document !== 'undefined') {
      document.cookie = `pijar_active_topic=${encodeURIComponent(activeTopicDisplay)}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `pijar_active_topic_key=${encodeURIComponent(intakeResult ? 'custom' : customTopic.trim() ? 'custom' : topicKey)}; path=/; max-age=604800; SameSite=Lax`;
    }

    router.push(
      `/diagnostic?topic=${encodeURIComponent(activeTopicDisplay)}&count=${diagnosticCount}&practitioner=${isPractitioner ? '1' : '0'}`
    );
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
            {step === 1 ? 'Pilih Topik & Curhat Belajar' : step === 2 ? 'Tujuan & Mode Diagnostik' : 'Preferensi Format'}
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

        {/* ── Step 1: Intake & Topic Selection ── */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Apa yang ingin kamu kuasai?</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4 leading-relaxed">
              Kamu bisa menceritakan keluh kesah belajarmu kepada AI Mentor, atau langsung memilih katalog kurasi.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border mb-5">
              <button
                type="button"
                onClick={() => setIntakeTab('counselor')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  intakeTab === 'counselor'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquareHeart className="w-3.5 h-3.5 text-amber-500" />
                AI Learning Counselor (Curhat & Masalah)
              </button>
              <button
                type="button"
                onClick={() => setIntakeTab('catalog')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  intakeTab === 'catalog'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-blue-500" />
                Katalog Cepat
              </button>
            </div>

            {/* ══ SUB-TAB A: COUNSELOR BOX ══ */}
            {intakeTab === 'counselor' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Ceritakan materi impianmu & kendala yang kamu hadapi:
                  </label>
                  <textarea
                    rows={3}
                    value={counselorText}
                    onChange={(e) => setCounselorText(e.target.value)}
                    placeholder="Contoh: Saya ingin belajar cyber security, tapi bingung harus mulai darimana karena tidak punya sumber belajar yang cukup dan banyak istilah teknis..."
                    className="w-full p-3 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-muted-foreground/60 resize-none"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium">Contoh keluh kesah:</span>
                    <button
                      type="button"
                      onClick={() => setCounselorText('saya ingin belajar tentang cyber security, namun aku bingung harus mulai darimana karena aku tidak punya sumber belajar yang cukup')}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      🛡️ Pemula Cyber Security
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounselorText('saya ingin mendalami cybersecurity sampai tingkat praktisi mahir untuk arsitektur zero-trust, reverse engineering, dan exploit mitigation')}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ⚔️ Praktisi Mahir
                    </button>
                  </div>

                  <div className="mt-3.5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAnalyzeCounselorText}
                      disabled={!counselorText.trim() || analyzingIntake}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white pijar-gradient shadow-md shadow-amber-500/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      {analyzingIntake ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Membedah Keluh Kesah...
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-3.5 h-3.5" />
                          Analisis Kebutuhanku dengan AI
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Counselor Result Card */}
                {intakeResult && (
                  <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-lg animate-fade-in space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Hasil Analisis Kognitif AI:
                      </span>
                      {intakeResult.is_practitioner_track ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Award className="w-3 h-3" /> Jalur Praktisi Mahir
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          🌱 Jalur Fondasi Terstruktur
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-extrabold text-foreground">{intakeResult.canonical_topic}</div>
                      <div className="text-[11px] text-muted-foreground">{intakeResult.domain_category}</div>
                    </div>

                    {/* Empathy Mentor Note */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground leading-relaxed">
                      <span className="font-bold block text-[11px] text-amber-600 dark:text-amber-400 mb-0.5">
                        Catatan Empati Mentor:
                      </span>
                      {intakeResult.empathy_mentor_note}
                    </div>

                    {/* Pain Points */}
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Kendala Belajar yang Terdeteksi & Akan Diselesaikan:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {intakeResult.pain_points.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                          >
                            ✓ {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ SUB-TAB B: CATALOG & QUICK SELECT ══ */}
            {intakeTab === 'catalog' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl border border-border/80 bg-background/70">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <PenTool className="w-3 h-3 text-amber-500" />
                    Ketik topik kustom:
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      if (e.target.value.trim()) setTopicKey('');
                      setIntakeResult(null);
                    }}
                    placeholder="Misal: Rust Concurrency, System Design Microservices..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {CURATED_TOPICS.map((t) => {
                    const isSelected = !customTopic.trim() && !intakeResult && topicKey === t.id;
                    return (
                      <button
                        key={t.id}
                        id={`topic-${t.id}`}
                        onClick={() => handleSelectCurated(t.id)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-border bg-background/60 hover:border-amber-500/30'
                        }`}
                      >
                        <div className={isSelected ? 'text-amber-500' : 'text-muted-foreground'}>
                          {t.icon}
                        </div>
                        <div>
                          <div className="text-xs font-semibold leading-tight">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Goal & Diagnostic Mode ── */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Tujuan & Kedalaman Diagnostik</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mb-5">
              Pijar menyesuaikan asesmen untuk topik: <strong className="text-foreground">{activeTopicDisplay}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Sasaran Belajar Siswa:
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
                        <div className="font-semibold text-xs leading-tight flex items-center justify-between">
                          {g.label}
                          {g.id === 'practitioner' && <Award className="w-3.5 h-3.5 text-purple-500" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{g.desc}</div>
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
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
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
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{dm.desc}</p>
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
            <p className="text-muted-foreground text-xs sm:text-sm mb-6">
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-xs sm:text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
            >
              Lanjut <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="onboarding-finish"
              onClick={handleFinish}
              disabled={!canNext || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-xs sm:text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
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

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Pijar mendengarkan keluh kesah belajarmu dan menyusun Knowledge Graph mandiri tanpa mock template.
      </p>
    </div>
  );
}
