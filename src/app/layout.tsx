import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pijar — Adaptive Learning Platform',
  description:
    'Pijar mendiagnosis knowledge gap kamu dan membangun jalur belajar personal berbasis AI. Mulai dari mana kamu berada, capai tujuanmu lebih cepat.',
  keywords: ['adaptive learning', 'AI tutor', 'knowledge graph', 'belajar adaptif', 'pijar'],
  openGraph: {
    title: 'Pijar — Adaptive Learning Platform',
    description: 'Platform belajar adaptif bertenaga AI yang membangun kurikulum personal untukmu.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={300}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
