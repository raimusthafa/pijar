'use client';

import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/lib/i18n/define';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** ID | EN. Sets the pj-locale cookie, then refreshes so server components re-render in the new language. */
export function LocaleSwitch({ className }: { className?: string }) {
  const { t, locale } = useT();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={t('common.locale.label')}
      className={cn('inline-flex items-center rounded-pill bg-surface p-0.5', className)}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          aria-label={t(`common.locale.${l}`)}
          onClick={() => choose(l)}
          className={cn(
            'pj-press h-11 min-w-11 rounded-pill px-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 md:h-7',
            l === locale
              ? 'border border-hairline bg-raised text-foreground'
              : 'border border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
