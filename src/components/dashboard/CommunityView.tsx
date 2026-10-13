'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MessagesSquare, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';
import { CATEGORIES, LIMITS, cleanDraft, isMissingTable, type CommunityPost, type PostCategory } from '@/lib/community/posts';

type Load = 'loading' | 'ready' | 'missing' | 'error';

/** Real discussions from community_posts. Anyone reads, authors insert. Others show as "a Pijar learner" because profiles are private. */
export function CommunityView({ userId, concepts }: { userId: string; concepts: string[] }) {
  const { t, locale } = useT();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [load, setLoad] = useState<Load>('loading');
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [category, setCategory] = useState<PostCategory>('question');
  const titleRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await createClient()
        .from('community_posts')
        .select('id, author_id, title, content, concept_tag, category, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (error) return setLoad(isMissingTable(error) ? 'missing' : 'error');
      setPosts((data ?? []) as CommunityPost[]);
      setLoad('ready');
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  const retry = () => { setLoad('loading'); setAttempt(a => a + 1); };
  useEffect(() => { if (open) titleRef.current?.focus(); }, [open]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const draft = cleanDraft({
      title: String(f.get('title') ?? ''),
      content: String(f.get('content') ?? ''),
      concept: String(f.get('concept') ?? ''),
      category,
    });
    if (!draft) return setFormError(t('dashboard.community.form.invalid'));
    setFormError(null);
    setSending(true);
    const { data, error } = await createClient()
      .from('community_posts')
      .insert({ author_id: userId, title: draft.title, content: draft.content, concept_tag: draft.concept, category: draft.category })
      .select('id, author_id, title, content, concept_tag, category, created_at')
      .single();
    setSending(false);
    if (error || !data) {
      return setFormError(isMissingTable(error) ? t('dashboard.community.error.missing') : t('dashboard.community.error.post'));
    }
    setPosts(p => [data as CommunityPost, ...p]);
    setLoad('ready');
    setOpen(false);
  }

  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const writeButton = (label: string, variant: 'primary' | 'secondary' = 'secondary') => (
    <Button variant={variant} onClick={() => setOpen(true)} aria-expanded={open} aria-controls={listId + 'form'}>
      <Plus strokeWidth={1.75} aria-hidden />
      {label}
    </Button>
  );

  return (
    <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-h4 font-semibold">{t('dashboard.community.title')}</h2>
          <p className="max-w-prose text-sm text-muted-foreground">{t('dashboard.community.desc')}</p>
        </div>
        {!open && load === 'ready' && posts.length > 0 && writeButton(t('dashboard.community.new'))}
      </div>

      {open && (
        <Card tone="raised" className="pj-rise">
          <form id={listId + 'form'} onSubmit={submit} className="grid gap-4 px-(--card-spacing)" noValidate>
            <div className="grid gap-1.5">
              <label htmlFor={listId + 't'} className="text-sm font-medium">{t('dashboard.community.form.title')}</label>
              <Input id={listId + 't'} name="title" ref={titleRef} maxLength={LIMITS.title} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor={listId + 'c'} className="text-sm font-medium">{t('dashboard.community.form.concept')}</label>
                <Input id={listId + 'c'} name="concept" list={listId + 'dl'} maxLength={LIMITS.concept} required />
                <datalist id={listId + 'dl'}>
                  {[...new Set(concepts)].slice(0, 40).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <fieldset className="grid gap-1.5">
                <legend className="text-sm font-medium">{t('dashboard.community.form.category')}</legend>
                <div className="flex flex-wrap gap-1.5" role="radiogroup">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={category === c}
                      onClick={() => setCategory(c)}
                      className={`pj-press h-11 rounded-pill border px-4 text-sm transition-colors md:h-10 ${
                        category === c ? 'border-transparent bg-action text-action-foreground' : 'border-field hover:bg-hover'
                      }`}
                    >
                      {t(`dashboard.community.cat.${c}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor={listId + 'b'} className="text-sm font-medium">{t('dashboard.community.form.content')}</label>
              <Textarea id={listId + 'b'} name="content" rows={5} maxLength={LIMITS.content} required />
            </div>
            {formError && <p role="alert" className="text-sm">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); setFormError(null); }}>
                {t('dashboard.community.form.cancel')}
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? t('dashboard.community.form.sending') : t('dashboard.community.form.submit')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {load === 'loading' && (
        <div className="grid gap-3" role="status" aria-label={t('common.state.loading')}>
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-card" />)}
        </div>
      )}

      {(load === 'missing' || load === 'error') && (
        <Card tone="raised">
          <div className="grid justify-items-start gap-3 px-(--card-spacing)" role="alert">
            <p className="text-sm">{load === 'missing' ? t('dashboard.community.error.missing') : t('dashboard.community.error.load')}</p>
            <Button variant="secondary" size="sm" onClick={retry}>{t('common.action.retry')}</Button>
          </div>
        </Card>
      )}

      {load === 'ready' && posts.length === 0 && !open && (
        <Card>
          <EmptyState
            icon={MessagesSquare}
            title={t('dashboard.community.empty.title')}
            description={t('dashboard.community.empty.desc')}
            action={writeButton(t('dashboard.community.empty.cta'), 'primary')}
          />
        </Card>
      )}

      {load === 'ready' && posts.length > 0 && (
        <ul className="grid gap-3">
          {posts.map(p => (
            <li key={p.id}>
              <Card tone="raised" className="gap-3">
                <article className="grid gap-2 px-(--card-spacing)">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.category && <Badge variant="outline">{t(`dashboard.community.cat.${p.category}`)}</Badge>}
                    <span>{p.concept_tag}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                  <p className="text-sm whitespace-pre-line">{p.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.author_id === userId ? t('dashboard.community.author.you') : t('dashboard.community.author.other')}
                    {' · '}
                    {date.format(new Date(p.created_at))}
                  </p>
                </article>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
