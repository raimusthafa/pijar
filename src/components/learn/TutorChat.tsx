'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { MathText } from '@/components/ui/math-text';

interface Msg { role: 'user' | 'assistant'; content: string }

/** Floating tutor chat for the lesson. Streams from /api/chat. */
export function TutorChat({ nodeId, title, topic }: { nodeId: string; title: string; topic: string }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history: Msg[] = [...messages, { role: 'user', content }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    const setLast = (c: string) =>
      setMessages(prev => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: c } : m)));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, nodeId, conceptTitle: title, topic, language: locale }),
      });
      if (!res.ok || !res.body) throw new Error('chat');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setLast(acc);
      }
    } catch {
      setLast(t('learn.chat.error'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        className="fixed right-5 bottom-5 z-40 h-12 bg-amber pr-5 pl-4 text-amber-foreground hover:bg-amber hover:brightness-95"
        onClick={() => setOpen(true)}
      >
        <Bot className="size-5 text-action-foreground" strokeWidth={1.75} aria-hidden />
        {t('learn.chat.open')}
      </Button>
    );
  }

  return (
    <section
      aria-label={t('learn.chat.title')}
      className="fixed inset-x-3 bottom-3 z-40 flex h-[min(34rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-card border border-hairline-strong bg-raised sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{t('learn.chat.title')}</h2>
          <p className="truncate text-xs text-muted-foreground">{t('learn.chat.context', { title })}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label={t('learn.chat.close')}>
          <X strokeWidth={1.75} aria-hidden />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        <p className="max-w-[88%] rounded-inner bg-surface px-3 py-2 leading-relaxed">{t('learn.chat.greeting', { title })}</p>
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' && 'justify-end')}>
            {m.content ? (
              <p className={cn('max-w-[88%] rounded-inner px-3 py-2 leading-relaxed whitespace-pre-wrap', m.role === 'user' ? 'bg-action text-action-foreground' : 'bg-surface')}>
                <MathText text={m.content} />
              </p>
            ) : (
              <div className="w-40 space-y-2 rounded-inner bg-surface px-3 py-2" role="status" aria-label={t('learn.chat.typing')}>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {(['analogy', 'prereq'] as const).map(k => (
          <Button key={k} variant="secondary" size="xs" className="shrink-0" disabled={busy} onClick={() => send(t(`learn.chat.preset.${k}.text`))}>
            {t(`learn.chat.preset.${k}`)}
          </Button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-hairline p-3"
        onSubmit={e => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('learn.chat.placeholder')}
          aria-label={t('learn.chat.placeholder')}
          className="h-11 min-w-0 flex-1 rounded-control border border-field bg-raised px-3 text-sm md:h-10"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label={t('learn.chat.send')}>
          <Send strokeWidth={1.75} aria-hidden />
        </Button>
      </form>
    </section>
  );
}
