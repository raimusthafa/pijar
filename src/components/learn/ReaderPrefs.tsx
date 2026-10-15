'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus, RotateCcw, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import {
  DEFAULT_READER_PREFS,
  READER_SIZES,
  READER_STORAGE_KEY,
  READER_THEMES,
  parseReaderPrefs,
  type ReaderPrefs as Prefs,
} from '@/lib/learn/reader-prefs';
import { cn } from '@/lib/utils';

const swatch: Record<(typeof READER_THEMES)[number], string> = {
  light: 'bg-[var(--pj-reader-light-bg)] text-[var(--pj-reader-light-fg)]',
  sepia: 'bg-[var(--pj-reader-sepia-bg)] text-[var(--pj-reader-sepia-fg)]',
  dark: 'bg-[var(--pj-reader-dark-bg)] text-[var(--pj-reader-dark-fg)]',
};

/** Reader prefs, remembered per browser. Read lazily: the lesson only renders them after it loads on the client. */
export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return parseReaderPrefs(localStorage.getItem(READER_STORAGE_KEY));
    } catch {
      return DEFAULT_READER_PREFS;
    }
  });
  const update = (next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };
  return [prefs, update] as const;
}

/** Text size and color for the lesson text block only. The block itself reads `prefs`. */
export function ReaderPrefs({ prefs, onChange }: { prefs: Prefs; onChange: (p: Prefs) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const at = READER_SIZES.indexOf(prefs.size as (typeof READER_SIZES)[number]);
  const step = (d: number) => onChange({ ...prefs, size: READER_SIZES[Math.max(0, Math.min(READER_SIZES.length - 1, at + d))] });

  return (
    <div className="fixed right-5 bottom-20 z-40 flex flex-col items-end gap-2">
      {open && (
        <section aria-label={t('learn.reader.title')} className="w-64 rounded-card border border-hairline-strong bg-raised p-4 text-foreground">
          <p className="text-sm font-medium">{t('learn.reader.size')}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button variant="secondary" size="icon-sm" onClick={() => step(-1)} disabled={at <= 0} aria-label={t('learn.reader.size.smaller')}>
              <Minus strokeWidth={1.75} aria-hidden />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">{prefs.size}%</span>
            <Button variant="secondary" size="icon-sm" onClick={() => step(1)} disabled={at >= READER_SIZES.length - 1} aria-label={t('learn.reader.size.larger')}>
              <Plus strokeWidth={1.75} aria-hidden />
            </Button>
          </div>

          <p className="mt-4 text-sm font-medium">{t('learn.reader.theme')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {READER_THEMES.map(th => (
              <button
                key={th}
                type="button"
                aria-pressed={prefs.theme === th}
                onClick={() => onChange({ ...prefs, theme: th })}
                className={cn(
                  'pj-press h-11 rounded-inner border text-sm font-medium md:h-10',
                  swatch[th],
                  prefs.theme === th ? 'border-2 border-amber' : 'border-hairline-strong',
                )}
              >
                {t(`learn.reader.theme.${th}` as MessageKey)}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => onChange(DEFAULT_READER_PREFS)}>
            <RotateCcw strokeWidth={1.75} aria-hidden />
            {t('learn.reader.reset')}
          </Button>
        </section>
      )}
      <Button
        variant="secondary"
        className="h-12 border-2 border-amber bg-raised px-5 hover:bg-raised hover:brightness-95"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Type strokeWidth={1.75} aria-hidden />
        {t('learn.reader.open')}
      </Button>
    </div>
  );
}
