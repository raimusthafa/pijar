import { Suspense } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HtmlLang } from '@/components/shell/HtmlLang';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale } from '@/lib/i18n/server';

// Headline face: Outfit, vendored in public/fonts (OFL). Body and app UI use the system stack.
const outfit = localFont({
  src: [
    { path: '../../public/fonts/Outfit-latin-ext.woff2', weight: '100 900', style: 'normal' },
    { path: '../../public/fonts/Outfit-latin.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-outfit',
  display: 'swap',
});

// Static on purpose: cacheComponents forbids reading the locale cookie in metadata.
export const metadata: Metadata = {
  title: { default: 'Pijar', template: '%s | Pijar' },
  description: 'Pijar mencari konsep dasar yang belum kuat, lalu menyusun jalur belajar dari titik itu.',
  openGraph: {
    title: 'Pijar',
    description: 'Pijar mencari konsep dasar yang belum kuat, lalu menyusun jalur belajar dari titik itu.',
    type: 'website',
  },
};

// The locale cookie is runtime data, so it is read inside Suspense (cacheComponents is on).
// <html lang> is "id" in the static shell and HtmlLang corrects it right after hydration.
async function LocaleBoundary({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale}>
      <HtmlLang locale={locale} />
      <TooltipProvider delay={300}>{children}</TooltipProvider>
    </I18nProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Suspense fallback={null}>
          <LocaleBoundary>{children}</LocaleBoundary>
        </Suspense>
      </body>
    </html>
  );
}
