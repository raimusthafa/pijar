'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';
import { generateStudySchedule } from '@/lib/scheduler/engine';
import type { DashboardGraph } from './types';

type Sync = 'loading' | 'saved' | 'local';

/**
 * Today's tasks for one graph. The ticks persist in user_study_tasks under a key of
 * date:graph:task, so the list starts fresh each day. If the table is missing the ticks stay local.
 */
export function LearningSchedulerView({ graph }: { graph: DashboardGraph }) {
  const { t } = useT();
  const [day] = useState(() => new Date().toLocaleDateString('sv'));
  const [done, setDone] = useState<Set<string>>(new Set());
  const [sync, setSync] = useState<Sync>('loading');
  const [saveError, setSaveError] = useState(false);

  const prefix = `${day}:${graph.id}:`;
  const items = useMemo(
    () => generateStudySchedule(graph.nodes, graph.edges, 45).items.filter(i => i.dayOffset === 0),
    [graph],
  );

  useEffect(() => {
    if (!day) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await createClient()
        .from('user_study_tasks')
        .select('task_key, completed')
        .like('task_key', `${prefix}%`);
      if (cancelled) return;
      setDone(new Set(error ? [] : (data ?? []).filter(r => r.completed).map(r => r.task_key.slice(prefix.length))));
      setSync(error ? 'local' : 'saved');
    })();
    return () => { cancelled = true; };
  }, [day, prefix]);

  async function toggle(id: string) {
    const checked = !done.has(id);
    const apply = (on: boolean) => setDone(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    apply(checked);
    setSaveError(false);
    if (sync !== 'saved') return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user
      ? await supabase.from('user_study_tasks').upsert(
          { user_id: user.id, task_key: prefix + id, completed: checked, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,task_key' },
        )
      : { error: true };
    if (error) { apply(!checked); setSaveError(true); }
  }

  const names = new Map(graph.nodes.map(n => [n.id, n.label]));
  const labelOf = (i: (typeof items)[number]) =>
    `${names.get(i.nodeId) ?? i.conceptLabel}${i.priority === 'review' ? ` (${t('dashboard.tasks.reviewTag')})` : ''}`;

  const doneCount = items.filter(i => done.has(i.id)).length;

  return (
    <Card className="pj-rise" style={{ '--pj-i': 2 } as React.CSSProperties}>
      <div className="grid gap-3 px-(--card-spacing)">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-display text-h4 font-semibold text-foreground">{t('dashboard.tasks.title')}</h2>
          {items.length > 0 && (
            <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {t('dashboard.tasks.progress', { done: doneCount, total: items.length })}
            </p>
          )}
        </div>

        {sync === 'loading' ? (
          <div className="grid gap-2" role="status" aria-label={t('dashboard.tasks.loading')}>
            <Skeleton className="h-11 w-full rounded-inner" />
            <Skeleton className="h-11 w-5/6 rounded-inner" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{t('dashboard.tasks.empty')}</p>
        ) : (
          <ul className="grid gap-1.5">
            {items.map(item => {
              const isDone = done.has(item.id);
              return (
                <li
                  key={item.id}
                  className="group flex min-h-12 items-center gap-3 rounded-inner border border-transparent px-3 py-2 transition-colors hover:bg-hover hover:border-hairline"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={labelOf(item)}
                    onClick={() => toggle(item.id)}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-control transition-all ${
                      isDone
                        ? 'bg-action text-action-foreground'
                        : 'border border-field bg-raised group-hover:border-hairline-strong'
                    }`}
                  >
                    {isDone && <Check className="size-3.5 stroke-[2.5]" aria-hidden />}
                  </button>
                  <Link
                    href={`/learn/${graph.id}/${item.nodeId}?topic=${encodeURIComponent(graph.topic)}`}
                    className={`min-w-0 flex-1 truncate text-sm transition-colors ${
                      isDone ? 'text-muted-foreground line-through' : 'font-medium text-foreground'
                    }`}
                  >
                    {labelOf(item)}
                  </Link>
                  <span className="shrink-0 rounded-pill bg-surface-strong px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {t('dashboard.queue.minutes', { n: item.estimatedMinutes })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {sync === 'local' && items.length > 0 && <p className="text-xs text-muted-foreground">{t('dashboard.tasks.unsaved')}</p>}
        {saveError && <p role="alert" className="text-xs text-foreground">{t('dashboard.tasks.saveError')}</p>}
      </div>
    </Card>
  );
}
