'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, Camera, PencilRuler, Square, X } from 'lucide-react';
import { AppShell, PageBody } from '@/components/shell/AppShell';
import type { ShellUser } from '@/components/shell/UserMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/input';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { PHASES, type Phase } from '@/lib/workspace/five-e';
import { advance, openWorkspace, sendEvent } from '@/lib/workspace/client';
import { cn } from '@/lib/utils';
import { CanvasPad } from './CanvasPad';
import { errKey, fitSize, nearBottom, phaseIndex } from './logic';

type Concept = { label: string; topic: string; objective: string };
type Msg = {
  id: string; role: 'user' | 'assistant'; kind: 'chat' | 'image' | 'canvas' | 'phase';
  content: string; imageUrl?: string | null; phase: Phase; state?: 'streaming' | 'error' | 'stopped'; errorKey?: string;
};
type Attach = { kind: 'image' | 'canvas'; dataUrl: string };
type ApiEvent = { id: string; kind: Msg['kind'] | 'quiz'; role: 'user' | 'assistant'; content: string; imageUrl: string | null };

const pk = (p: Phase) => `workspace.phase.${p}` as MessageKey;

/** Rebuild the timeline from stored events, tracking which phase each tutor message belonged to. */
function toMsgs(events: ApiEvent[]): Msg[] {
  let phase: Phase = 'engage';
  const out: Msg[] = [];
  for (const e of events) {
    if (e.kind === 'phase') {
      if ((PHASES as readonly string[]).includes(e.content)) phase = e.content as Phase;
      out.push({ id: e.id, role: 'assistant', kind: 'phase', content: phase, phase });
    } else {
      out.push({ id: e.id, role: e.role, kind: e.kind === 'quiz' ? 'chat' : e.kind, content: e.content, imageUrl: e.imageUrl, phase });
    }
  }
  return out;
}

/** Downscale a photo to at most 1024px on the longest side and return a JPEG data URL. */
async function photoToDataUrl(file: File) {
  const bmp = await createImageBitmap(file);
  const { width, height } = fitSize(bmp.width, bmp.height, 1024);
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  c.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  return c.toDataURL('image/jpeg', 0.85);
}

function Stepper({ phase }: { phase: Phase }) {
  const { t } = useT();
  const cur = phaseIndex(phase);
  return (
    <div>
      <ol aria-label={t('workspace.stepper.label')} className="flex gap-1.5">
        {PHASES.map((p, i) => (
          <li key={p} aria-current={i === cur ? 'step' : undefined} className="min-w-0 flex-1">
            <div className={cn('h-1.5 rounded-pill transition-colors duration-300', i < cur ? 'bg-action' : i === cur ? 'bg-amber' : 'bg-surface-strong')} />
            <p className={cn('mt-2 truncate text-xs', i === cur ? 'font-medium text-foreground' : 'hidden text-muted-foreground sm:block')}>
              {t(pk(p))}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
        {t(`${pk(phase)}.desc` as MessageKey)}
      </p>
    </div>
  );
}

function Item({ m, onRetry }: { m: Msg; onRetry: () => void }) {
  const { t } = useT();
  if (m.kind === 'phase') {
    return (
      <li className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-hairline" />
        {t(pk(m.phase))}
        <span className="h-px flex-1 bg-hairline" />
      </li>
    );
  }
  const mine = m.role === 'user';
  return (
    <li className={cn('flex flex-col gap-1.5', mine ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {mine ? t('workspace.chat.you') : t('workspace.chat.tutor')}
      </div>
      <div className={cn('max-w-[min(92%,38rem)] rounded-inner px-4 py-3 text-sm leading-relaxed', mine ? 'bg-surface' : 'border border-hairline bg-raised')}>
        {m.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.imageUrl}
            alt={t(m.kind === 'canvas' ? 'workspace.chat.canvas' : 'workspace.chat.photo')}
            className="mb-2 max-h-64 w-auto max-w-full rounded-control border border-hairline bg-raised"
          />
        )}
        {m.state === 'streaming' && !m.content ? (
          <p className="text-muted-foreground motion-safe:animate-pulse">{t('workspace.chat.thinking')}</p>
        ) : (
          m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>
        )}
        {m.state === 'stopped' && <p className="mt-1 text-xs text-muted-foreground">{t('workspace.chat.stopped')}</p>}
        {m.state === 'error' && (
          <div className="mt-2 flex flex-wrap items-center gap-2" role="alert">
            <p className="text-xs text-danger">{t(`workspace.err.${m.errorKey ?? 'generic'}` as MessageKey)}</p>
            <Button variant="secondary" size="xs" onClick={onRetry}>{t('workspace.chat.retry')}</Button>
          </div>
        )}
      </div>
    </li>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-20 w-1/2 self-end" />
      <Skeleton className="h-28 w-3/4" />
    </div>
  );
}

export function Workspace({ graphId, nodeId, concept, user }: { graphId: string; nodeId: string; concept: Concept; user?: ShellUser }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'blocked' | 'error'>('loading');
  const [wsId, setWsId] = useState('');
  const [phase, setPhase] = useState<Phase>('engage');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [attach, setAttach] = useState<Attach | null>(null);
  const [busy, setBusy] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [composeErr, setComposeErr] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const [advanceErr, setAdvanceErr] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastSend = useRef<{ text: string; attach: Attach | null; userId: string } | null>(null);

  const fail = useCallback((e: unknown) => {
    const err = e as { code?: string; status?: number };
    if (err.status === 401) router.push('/auth/login');
    return err.code;
  }, [router]);

  useEffect(() => {
    let live = true;
    openWorkspace(graphId, nodeId)
      .then((r) => {
        if (!live) return;
        setWsId(r.workspace.id);
        setPhase(r.workspace.phase);
        setMsgs(toMsgs(r.events as ApiEvent[]));
        setStatus('ready');
      })
      .catch((e) => {
        if (!live) return;
        const code = fail(e);
        setStatus(code === 'migration_missing' ? 'blocked' : 'error');
      });
    return () => { live = false; };
  }, [graphId, nodeId, fail]);

  // Follow the tail only while the reader is already near it.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs, status]);

  const patchLast = (fn: (m: Msg) => Msg) => setMsgs((ms) => ms.map((m, i) => (i === ms.length - 1 ? fn(m) : m)));

  const run = useCallback(async (body: string, att: Attach | null, userId: string) => {
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    lastSend.current = { text: body, attach: att, userId };
    setMsgs((ms) => [...ms, { id: `a-${Date.now()}`, role: 'assistant', kind: 'chat', content: '', phase, state: 'streaming' }]);
    try {
      const res = await sendEvent(wsId, {
        kind: att?.kind ?? 'chat', text: body || undefined, imageDataUrl: att?.dataUrl, language: locale,
        concept: { label: concept.label, topic: concept.topic },
      });
      for await (const chunk of res.chunks) {
        if (ctl.signal.aborted) break;
        patchLast((m) => ({ ...m, content: m.content + chunk }));
      }
      patchLast((m) => ({ ...m, state: ctl.signal.aborted ? 'stopped' : undefined }));
    } catch (e) {
      const code = fail(e);
      patchLast((m) => ({ ...m, state: 'error', errorKey: errKey(code) }));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }, [wsId, phase, locale, concept.label, concept.topic, fail]);

  const send = () => {
    const body = text.trim();
    if ((!body && !attach) || busy || status !== 'ready') return;
    const id = `u-${Date.now()}`;
    stick.current = true;
    setMsgs((ms) => [...ms, { id, role: 'user', kind: attach?.kind ?? 'chat', content: body, imageUrl: attach?.dataUrl, phase }]);
    setText('');
    setAttach(null);
    setComposeErr('');
    void run(body, attach, id);
  };

  const retry = () => {
    const l = lastSend.current;
    if (!l || busy) return;
    stick.current = true;
    setMsgs((ms) => ms.slice(0, -1)); // drop the failed reply, keep the user's message
    void run(l.text, l.attach, l.userId);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      setAttach({ kind: 'image', dataUrl: await photoToDataUrl(file) });
      setComposeErr('');
    } catch {
      setComposeErr(t('workspace.err.invalid_image'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const next = async () => {
    setAdvancing(true);
    setAdvanceErr(false);
    try {
      const r = await advance(wsId);
      if (r.next === 'post-test') {
        const q = concept.topic ? `?topic=${encodeURIComponent(concept.topic)}` : '';
        router.push(`/learn/${graphId}/${nodeId}${q}`);
        return;
      }
      setPhase(r.phase);
      setMsgs((ms) => [...ms, { id: `p-${Date.now()}`, role: 'assistant', kind: 'phase', content: r.phase, phase: r.phase }]);
    } catch (e) {
      fail(e);
      setAdvanceErr(true);
    } finally {
      setAdvancing(false);
    }
  };

  const header = (
    <div className="pt-6 pb-4">
      <Link href="/workspace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        {t('workspace.back')}
      </Link>
      <h1 className="mt-3 font-display text-h3 font-semibold">{concept.label}</h1>
    </div>
  );

  let body: React.ReactNode;
  if (status === 'blocked' || status === 'error') {
    body = (
      <EmptyState
        icon={PencilRuler}
        title={t(status === 'blocked' ? 'workspace.blocked.title' : 'workspace.err.load')}
        description={status === 'blocked' ? t('workspace.blocked.desc') : undefined}
        action={status === 'error' ? <Button variant="secondary" onClick={() => router.refresh()}>{t('common.action.retry')}</Button> : undefined}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 flex-col gap-4">
          <Stepper phase={phase} />
          <div
            ref={scroller}
            onScroll={(e) => { stick.current = nearBottom(e.currentTarget); }}
            className="h-[52dvh] overflow-y-auto rounded-card border border-hairline bg-ground p-4 lg:h-auto lg:min-h-0 lg:flex-1"
          >
            {status === 'loading' ? (
              <WorkspaceSkeleton />
            ) : msgs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t('workspace.chat.empty')}</p>
            ) : (
              <ol role="log" aria-live="polite" aria-label={t('workspace.chat.log')} className="flex flex-col gap-4">
                {msgs.map((m) => <Item key={m.id} m={m} onRetry={retry} />)}
              </ol>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {attach && (
              <div className="flex items-center gap-3 rounded-inner border border-hairline bg-raised p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attach.dataUrl} alt={t('workspace.composer.preview')} className="h-16 w-auto max-w-40 rounded-control object-cover" />
                <Button variant="ghost" size="sm" onClick={() => setAttach(null)}>
                  <X strokeWidth={1.75} />
                  {t('workspace.composer.removePhoto')}
                </Button>
              </div>
            )}
            {composeErr && <p role="alert" className="text-xs text-danger">{composeErr}</p>}
            <div className="rounded-card border border-field bg-raised p-2">
              <label htmlFor="ws-msg" className="sr-only">{t('workspace.composer.label')}</label>
              <Textarea
                id="ws-msg"
                rows={2}
                value={text}
                disabled={status !== 'ready'}
                placeholder={t('workspace.composer.placeholder')}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
                }}
                className="min-h-14 resize-none border-0 bg-transparent px-2 text-base focus-visible:outline-none md:text-sm"
              />
              <div className="flex items-center gap-1">
                <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <Button variant="ghost" size="icon" aria-label={t('workspace.composer.photo')} disabled={status !== 'ready'} onClick={() => fileRef.current?.click()}>
                  <Camera strokeWidth={1.75} />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t('workspace.composer.canvas')} disabled={status !== 'ready'} onClick={() => setCanvasOpen(true)}>
                  <PencilRuler strokeWidth={1.75} />
                </Button>
                <span className="flex-1" />
                {busy ? (
                  <Button variant="secondary" onClick={() => abort.current?.abort()}>
                    <Square className="size-3.5 fill-current" strokeWidth={1.75} />
                    {t('workspace.composer.stop')}
                  </Button>
                ) : (
                  <Button onClick={send} disabled={status !== 'ready' || (!text.trim() && !attach)}>
                    <ArrowUp strokeWidth={1.75} />
                    {t('workspace.composer.send')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="lg:overflow-y-auto">
          <Card tone="raised" className="gap-5 border border-hairline p-6">
            <div>
              <p className="text-xs text-muted-foreground">{t('workspace.side.concept')}</p>
              <p className="mt-1 font-display text-h4 font-semibold">{concept.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('workspace.side.objective')}</p>
              <p className="mt-1 text-sm leading-relaxed">{concept.objective || t('workspace.side.objective.none')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('workspace.side.phase')}</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Badge variant="accent">{t(pk(phase))}</Badge>
                {t('workspace.stepper.step', { n: phaseIndex(phase) + 1, total: PHASES.length })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={next} disabled={status !== 'ready' || advancing || busy}>
                {advancing ? t('workspace.advance.busy') : t(phase === 'evaluate' ? 'workspace.advance.last' : 'workspace.advance')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('workspace.advance.hint')}</p>
              {advanceErr && <p role="alert" className="text-xs text-danger">{t('workspace.advance.error')}</p>}
            </div>
            <p className="border-t border-hairline pt-4 text-xs text-muted-foreground">
              {t('workspace.privacy')}{' '}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">{t('workspace.privacy.link')}</Link>
            </p>
          </Card>
        </aside>
      </div>
    );
  }

  return (
    <AppShell user={user} title={t('workspace.title')}>
      <PageBody className="flex min-h-full flex-col pb-4 lg:h-full lg:min-h-0">
        {header}
        {body}
      </PageBody>
      <Dialog open={canvasOpen} onOpenChange={setCanvasOpen}>
        <DialogContent closeLabel={t('common.action.close')} className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('workspace.canvas.title')}</DialogTitle>
            <DialogDescription>{t('workspace.canvas.desc')}</DialogDescription>
          </DialogHeader>
          <CanvasPad onExport={(dataUrl) => { setAttach({ kind: 'canvas', dataUrl }); setCanvasOpen(false); }} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
