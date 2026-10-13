import Link from 'next/link';
import { Footer } from '@/components/shell/Footer';
import { MarketingNav } from '@/components/shell/MarketingNav';
import { getT } from '@/lib/i18n/server';
import type { MessageKey } from '@/lib/i18n/messages';

// Sections per document and how many paragraphs each has. The text is in messages/legal.ts.
const DOCS = {
  terms: [['use', 2], ['account', 2], ['content', 2], ['ai', 1], ['rules', 1], ['changes', 1], ['end', 1], ['contact', 1]],
  privacy: [['collect', 3], ['where', 1], ['gemini', 3], ['never', 1], ['cookies', 1], ['rights', 1], ['age', 1], ['changes', 1], ['contact', 1]],
} as const;

export async function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const { t } = await getT();
  const contact = t('legal.common.contact');
  const key = (rest: string) => `legal.${doc}.${rest}` as MessageKey;

  return (
    <>
      <MarketingNav />
      <main id="main" className="pj-gutter flex-1 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="font-display text-h2 font-semibold">{t(key('title'))}</h1>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('legal.common.draft')} {t('legal.common.updated')}
          </p>
          <p className="mt-8 text-lg">{t(key('intro'))}</p>
          {DOCS[doc].map(([id, count]) => (
            <section key={id} className="mt-10">
              <h2 className="font-display text-h4 font-semibold">{t(key(`${id}.title`))}</h2>
              {Array.from({ length: count }, (_, i) => (
                <p key={i} className="mt-3 text-base text-foreground">
                  {t(key(`${id}.p${i + 1}`), { contact })}
                </p>
              ))}
            </section>
          ))}
          <Link href="/" className="mt-12 inline-block text-sm underline underline-offset-4 decoration-hairline-strong hover:decoration-foreground">
            {t('legal.common.backHome')}
          </Link>
        </article>
      </main>
      <Footer />
    </>
  );
}
