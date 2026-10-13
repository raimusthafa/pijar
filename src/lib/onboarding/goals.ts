// Pure helpers for the onboarding goal flow (no React, importable by node --test).

export type GoalStatus = 'pending' | 'active' | 'done';

export interface LearningGoal {
  id: string;
  topic: string;
  node_id: string | null;
  graph_id: string | null;
  status: GoalStatus;
}

interface IntakeLike {
  canonical_topic: string;
  detected_level?: string;
  is_practitioner_track?: boolean;
  recommended_first_step?: string;
  recommended_diagnostic_focus?: string[];
}

/** True when the learning_goals table is not there yet (Postgres 42P01 or PostgREST PGRST205), so we continue without saving. */
export function isMissingGoalsTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  const m = error.message ?? '';
  return /learning_goals/.test(m) && /not (find|exist)|does not exist|schema cache/i.test(m);
}

// The offline reading in diagnostic/engine.ts writes long Indonesian sentences. Show a short label in the learner's language instead.
const FALLBACK_STEPS = [
  { prefix: 'Fokus pada evaluasi', id: 'Trade-off arsitektur dan kasus tepi', en: 'Architecture trade-offs and edge cases' },
  { prefix: 'Mulailah dengan modul model mental', id: 'Model mental dasar', en: 'Core mental models' },
];
const FOCUS_FALLBACKS: Record<string, string> = {
  'Model Mental & Filosofi Dasar': 'Core mental models',
  'Arsitektur Sistem & Trade-off': 'Architecture trade-offs',
};
const LONG = 80;

/** The first concept we will probe, taken from the intake. Empty when the intake gave nothing usable. */
export function startConcept(intake: IntakeLike | null | undefined, locale: 'id' | 'en' = 'id'): string {
  if (!intake) return '';
  const step = (intake.recommended_first_step ?? '').trim();
  const focus = (intake.recommended_diagnostic_focus?.[0] ?? '').trim();
  const known = FALLBACK_STEPS.find((f) => step.startsWith(f.prefix));
  if (known) return known[locale];
  const pick = step && step.length <= LONG ? step : focus || step;
  return locale === 'en' && FOCUS_FALLBACKS[pick] ? FOCUS_FALLBACKS[pick] : pick;
}

/** profiles.target_goal keeps its old vocabulary: beginner | practitioner | deepen. */
export function profileGoal(intake: IntakeLike | null | undefined): 'beginner' | 'practitioner' | 'deepen' {
  if (intake?.is_practitioner_track) return 'practitioner';
  if (!intake || intake.detected_level === 'absolute_beginner') return 'beginner';
  return 'deepen';
}

export const QUICK_COUNT = 5;
export const FULL_COUNT = 10;

/** Practitioner track defaults to the longer diagnostic, everyone else to the short one. */
export function defaultDiagnosticCount(intake: IntakeLike | null | undefined): number {
  return intake?.is_practitioner_track ? FULL_COUNT : QUICK_COUNT;
}

/** Active goal first, then the input order (newest first from the query). Same topic is listed once, active wins. */
export function orderGoals(goals: LearningGoal[]): LearningGoal[] {
  const seen = new Set<string>();
  const activeFirst = [...goals].sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'));
  return activeFirst.filter((g) => {
    const k = g.topic.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
