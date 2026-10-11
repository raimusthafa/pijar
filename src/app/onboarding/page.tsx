'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
  Code2, BrainCircuit, Calculator, Database, Globe, TrendingUp
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Step Data ────────────────────────────────────────────────
const TOPICS = [
  { id: 'dsa',   label: 'Struktur Data & Algoritma', icon: <Code2 className="w-5 h-5" />,         desc: 'Array, Graph, Dynamic Programming' },
  { id: 'ml',    label: 'Machine Learning',           icon: <BrainCircuit className="w-5 h-5" />,   desc: 'Supervised, Neural Networks, NLP' },
  { id: 'math',  label: 'Matematika Diskrit',         icon: <Calculator className="w-5 h-5" />,     desc: 'Logika, Graf, Kombinatorik' },
  { id: 'db',    label: 'Database & SQL',             icon: <Database className="w-5 h-5" />,       desc: 'Relational, NoSQL, Query Optimization' },
  { id: 'web',   label: 'Web Development',            icon: <Globe className="w-5 h-5" />,          desc: 'React, Next.js, REST API' },
  { id: 'stats', label: 'Statistik & Probabilitas',  icon: <TrendingUp className="w-5 h-5" />,     desc: 'Distribusi, Inferensi, Bayes' },
];

const GOALS = [
  { id: 'beginner',   label: 'Pemula',              desc: 'Baru mulai belajar topik ini dari dasar' },
  { id: 'interview',  label: 'Persiapan Interview', desc: 'Target kerja di perusahaan teknologi' },
  { id: 'exam',       label: 'Persiapan Ujian',     desc: 'UTS, UAS, atau sertifikasi' },
  { id: 'deepen',     label: 'Pendalaman Materi',   desc: 'Sudah tahu dasar, ingin lebih mahir' },
];

const STYLES = [
  {
    id: 'text',
    label: 'Ringkasan & Teks',
    desc: 'Penjelasan terstruktur, poin kunci, contoh kode',
    emoji: '📖',
  },
  {
    id: 'video',
    label: 'Visual & Video',
    desc: 'Kurasi video edukasi dengan catatan penting',
    emoji: '🎬',
  },
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]               = useState(1);
  const [topic, setTopic]             = useState('');
  const [goal, setGoal]               = useState('');
  const [style, setStyle]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const canNext = step === 1 ? !!topic : step === 2 ? !!goal : !!style;

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

    // Store chosen topic in sessionStorage and cookie for diagnostic & dashboard
    sessionStorage.setItem('pijar_topic', topic);
    sessionStorage.setItem('pijar_goal', goal);
    sessionStorage.setItem('pijar_style', style);
    if (typeof document !== 'undefined') {
      document.cookie = `pijar_active_topic_key=${encodeURIComponent(topic)}; path=/; max-age=604800; SameSite=Lax`;
    }
    router.push('/diagnostic');
  }

  return (
    <div className="min-h-screen pijar-gradient-hero flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pijar</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Langkah {step} dari {TOTAL_STEPS}</span>
          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {step === 1 ? 'Pilih Topik' : step === 2 ? 'Tentukan Tujuan' : 'Gaya Belajar'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full pijar-gradient rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg glass rounded-3xl p-8 shadow-xl">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: Topic ── */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1">Apa yang ingin kamu pelajari?</h1>
            <p className="text-muted-foreground text-sm mb-6">Pilih satu topik untuk sesi ini</p>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  id={`topic-${t.id}`}
                  onClick={() => setTopic(t.id)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                    topic === t.id
                      ? 'border-pijar-500 bg-pijar-50 shadow-md'
                      : 'border-border bg-background/60 hover:border-pijar-300'
                  }`}
                >
                  <div className={`${topic === t.id ? 'text-pijar-600' : 'text-muted-foreground'}`}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                  </div>
                  {topic === t.id && (
                    <CheckCircle2 className="w-4 h-4 text-pijar-500 absolute top-3 right-3" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Goal ── */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1">Apa tujuan belajarmu?</h1>
            <p className="text-muted-foreground text-sm mb-6">AI akan menyesuaikan kedalaman materi berdasarkan tujuanmu</p>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  id={`goal-${g.id}`}
                  onClick={() => setGoal(g.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                    goal === g.id
                      ? 'border-pijar-500 bg-pijar-50'
                      : 'border-border bg-background/60 hover:border-pijar-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    goal === g.id ? 'border-pijar-500 bg-pijar-500' : 'border-border'
                  }`}>
                    {goal === g.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{g.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Learning Style ── */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold mb-1">Bagaimana cara belajarmu?</h1>
            <p className="text-muted-foreground text-sm mb-6">Kamu bisa mengubah ini kapan saja di pengaturan</p>
            <div className="grid grid-cols-2 gap-4">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  id={`style-${s.id}`}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center text-center gap-3 p-6 rounded-2xl border-2 transition-all hover:shadow-md ${
                    style === s.id
                      ? 'border-pijar-500 bg-pijar-50'
                      : 'border-border bg-background/60 hover:border-pijar-300'
                  }`}
                >
                  <span className="text-4xl">{s.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</div>
                  </div>
                  {style === s.id && <CheckCircle2 className="w-5 h-5 text-pijar-500" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center justify-between mt-8">
          <button
            id="onboarding-back"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          {step < TOTAL_STEPS ? (
            <button
              id="onboarding-next"
              onClick={handleNext}
              disabled={!canNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Lanjut <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="onboarding-finish"
              onClick={handleFinish}
              disabled={!canNext || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl pijar-gradient text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Mulai Diagnosa <ArrowRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Butuh bantuan?{' '}
        <a href="mailto:support@pijar.app" className="underline hover:text-foreground">Hubungi kami</a>
      </p>
    </div>
  );
}
