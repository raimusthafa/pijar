import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { getT } from '@/lib/i18n/server';

/** Public footer (server component). Terms and Privacy links are required by simple-ui-rule 26 and 27. */
export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="pj-gutter pb-3">
      <div className="mx-auto flex max-w-[var(--pj-content-max)] flex-col gap-10 rounded-card-lg bg-surface px-6 py-10 md:flex-row md:items-start md:justify-between md:px-12">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo size={28} wordmark />
          <p className="text-sm text-muted-foreground">{t('shell.footer.tagline')}</p>
        </div>
        <nav aria-label={t('shell.footer.legalNav')} className="flex flex-col gap-1 text-sm">
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:underline md:min-h-8">
            {t('shell.footer.terms')}
          </Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:underline md:min-h-8">
            {t('shell.footer.privacy')}
          </Link>
        </nav>
        <div className="flex flex-col gap-3 md:items-end">
          <LocaleSwitch />
          <p className="text-xs text-muted-foreground">&copy; 2026 {t('shell.footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
