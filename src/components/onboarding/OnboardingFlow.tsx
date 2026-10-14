'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';
import type { CognitiveIntakeResult } from '@/types';
import {
  defaultDiagnosticCount,
  isMissingGoalsTable,
  orderGoals,
  profileGoal,
  startConcept,
  QUICK_COUNT,
  type LearningGoal,
} from '@/lib/onboarding/goals';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { GeneratingScreen, useStages } from '@/components/ui/generating-screen';
import { GoalStep } from './GoalStep';
import { ConfirmStep, type Understanding } from './ConfirmStep';
import { StyleStep, type LearningStyle } from './StyleStep';

type Step = 'goal' | 'confirm' | 'style';
const STEPS: Step[] = ['goal', 'confirm', 'style'];

function Stepper({ step }: { step: Step }) {
  const { t } = useT();
  const index = STEPS.indexOf(step);
  return (
    <div className="mb-4 px-1">
      <p className="mb-2 text-xs text-muted-foreground">
        {t('onboarding.step.of', { n: index + 1, total: STEPS.length })}
        <span className="sr-only">: {t(`onboarding.step.${step}`)}</span>
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1 flex-1 rounded-pill transition-colors duration-300 ${i <= index ? 'bg-amber' : 'bg-surface-strong'}`} />
        ))}
      </div>
    </div>
  );
}

export function OnboardingFlow() {
  const { t, locale } = useT();
  const analysisStages = useStages('onboarding', ['read', 'topic', 'summary']);
  const router = useRouter();
  const [supabase] = useState(createClient);
  const box = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const [step, setStep] = useState<Step>('goal');
  const [text, setText] = useState('');
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; style: LearningStyle; goal: string }>({ name: '', style: 'text', goal: 'beginner' });

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [intake, setIntake] = useState<CognitiveIntakeResult | null>(null);
  const [understood, setUnderstood] = useState<Understanding | null>(null);
  const [topic, setTopic] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);

  const [style, setStyle] = useState<LearningStyle>('text');
  const [count, setCount] = useState(QUICK_COUNT);
  const [saving, setSaving] = useState(false);

  // Past goals and the saved profile. A missing learning_goals table (migration not applied yet) just means no history.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [g, p] = await Promise.all([
          supabase.from('learning_goals').select('id, topic, node_id, graph_id, status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
          supabase.from('profiles').select('name, learning_style, target_goal').eq('id', user.id).maybeSingle(),
        ]);
        if (!live) return;
        if (!g.error && g.data) setGoals(orderGoals(g.data as LearningGoal[]));
        else if (g.error && !isMissingGoalsTable(g.error)) console.warn('learning_goals', g.error.message);
        if (p.data) {
          const saved: LearningStyle = p.data.learning_style === 'video' ? 'video' : 'text';
          setProfile({ name: p.data.name ?? '', style: saved, goal: p.data.target_goal ?? 'beginner' });
          setStyle(saved);
        }
      } catch {
        /* offline: the flow still works without history */
      } finally {
        if (live) setGoalsLoading(false);
      }
    })();
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, [supabase]);

  // Move focus to the new step's heading so keyboard and screen reader users land in the right place.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    box.current?.querySelector('h1')?.focus();
  }, [step]);

  async function analyze() {
    abort.current?.abort();
    const ctl = (abort.current = new AbortController());
    setStep('confirm');
    setStatus('loading');
    try {
      const res = await fetch('/api/intake/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text.trim() }),
        signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(20000)]),
      });
      const data = await res.json();
      if (!data.success || !data.intake) throw new Error('intake');
      const r: CognitiveIntakeResult = data.intake;
      setIntake(r);
      setTopic(r.canonical_topic);
      setUnderstood({ topic: r.canonical_topic, start: startConcept(r, locale), level: r.detected_level ?? null, words: text.trim() });
      setCount(defaultDiagnosticCount(r));
      setGoalId(null);
      setStatus('ready');
    } catch {
      if (!ctl.signal.aborted) setStatus('error');
    }
  }

  function useAsWritten() {
    const words = text.trim();
    setIntake(null);
    setTopic(words.slice(0, 120));
    setUnderstood({ topic: words, start: '', level: null, words });
    setCount(QUICK_COUNT);
    setGoalId(null);
    setStatus('ready');
  }

  function resumeGoal(g: LearningGoal) {
    abort.current?.abort();
    setIntake(null);
    setUnderstood(null);
    setTopic(g.topic);
    setGoalId(g.id);
    setCount(QUICK_COUNT);
    setStep('style');
  }

  function back(to: Step) {
    abort.current?.abort();
    setStep(to);
  }

  /** Makes this goal the only active one. Any failure (including the missing table) is non-blocking. */
  async function saveGoal(userId: string): Promise<string | null> {
    const t0 = topic.trim().toLowerCase();
    let id = goalId ?? goals.find((g) => g.topic.trim().toLowerCase() === t0)?.id ?? null;
    const off = await supabase.from('learning_goals').update({ status: 'pending' }).eq('user_id', userId).eq('status', 'active');
    if (off.error) return null;
    if (id) {
      const on = await supabase.from('learning_goals').update({ status: 'active' }).eq('id', id).eq('user_id', userId);
      return on.error ? null : id;
    }
    const ins = await supabase.from('learning_goals').insert({ user_id: userId, topic: topic.trim(), status: 'active' }).select('id').single();
    id = ins.error ? null : (ins.data?.id ?? null);
    return id;
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    const cleanTopic = topic.trim();
    const goal = intake ? profileGoal(intake) : profile.goal;
    let savedGoalId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: user.user_metadata?.full_name ?? profile.name,
          learning_style: style,
          target_goal: goal,
          updated_at: new Date().toISOString(),
        });
        savedGoalId = await saveGoal(user.id);
      }
    } catch {
      /* offline: continue, the diagnostic keeps the choices in sessionStorage */
    }

    const practitioner = intake?.is_practitioner_track || goal === 'practitioner';
    sessionStorage.setItem('pijar_topic', cleanTopic);
    sessionStorage.setItem('pijar_topic_key', 'custom');
    sessionStorage.setItem('pijar_goal', goal);
    sessionStorage.setItem('pijar_diagnostic_count', String(count));
    sessionStorage.setItem('pijar_style', style);
    sessionStorage.setItem('pijar_is_practitioner', practitioner ? 'true' : 'false');
    if (intake) sessionStorage.setItem('pijar_intake_context', JSON.stringify({ ...intake, canonical_topic: cleanTopic }));
    else sessionStorage.removeItem('pijar_intake_context');
    if (savedGoalId) sessionStorage.setItem('pijar_goal_id', savedGoalId);
    else sessionStorage.removeItem('pijar_goal_id');
    document.cookie = `pijar_active_topic=${encodeURIComponent(cleanTopic)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `pijar_active_topic_key=custom; path=/; max-age=604800; SameSite=Lax`;

    router.push(`/diagnostic?topic=${encodeURIComponent(cleanTopic)}&count=${count}&practitioner=${practitioner ? '1' : '0'}`);
  }

  if (step === 'confirm' && status === 'loading') {
    return <GeneratingScreen title={t('common.generating.onboarding.title')} stages={analysisStages} paceMs={4500} className="h-dvh" />;
  }

  return (
    <AuthFrame wide consent={false} above={<Stepper step={step} />}>
      <div ref={box} key={step} className="pj-rise">
        {step === 'goal' && (
          <GoalStep text={text} onText={setText} onSubmit={analyze} goals={goals} goalsLoading={goalsLoading} onUseGoal={resumeGoal} />
        )}
        {step === 'confirm' && (
          <ConfirmStep
            status={status}
            value={understood}
            topic={topic}
            onTopic={setTopic}
            onBack={() => back('goal')}
            onConfirm={() => setStep('style')}
            onRetry={analyze}
            onAsIs={useAsWritten}
          />
        )}
        {step === 'style' && (
          <StyleStep
            style={style}
            onStyle={setStyle}
            count={count}
            onCount={setCount}
            saving={saving}
            onBack={() => back(understood ? 'confirm' : 'goal')}
            onSubmit={finish}
          />
        )}
      </div>
    </AuthFrame>
  );
}
