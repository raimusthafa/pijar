'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/client';

/** "By continuing, you agree to the Terms of Service and the Privacy Policy." with both links. Put it under auth forms. */
export function LegalConsent({ className }: { className?: string }) {
  const { t } = useT();
  const link = 'underline underline-offset-4 decoration-hairline-strong hover:decoration-foreground';
  const parts = t('shell.consent').split(/(\{terms\}|\{privacy\})/);
  return (
    <p className={className ?? 'text-xs text-muted-foreground'}>
      {parts.map((part, i) =>
        part === '{terms}' ? (
          <Link key={i} href="/terms" className={link}>
            {t('shell.footer.terms')}
          </Link>
        ) : part === '{privacy}' ? (
          <Link key={i} href="/privacy" className={link}>
            {t('shell.footer.privacy')}
          </Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}
