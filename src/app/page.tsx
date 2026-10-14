import Link from 'next/link';
import { Database, Route, Send, ShieldOff, Trash2, Waypoints, Network } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/shell/Footer';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { MarketingNav } from '@/components/shell/MarketingNav';
import { ConceptMap } from '@/components/landing/ConceptMap';
import { HeroObject } from '@/components/landing/HeroObject';
import { MathDemo } from '@/components/landing/MathDemo';
import { Particles } from '@/components/landing/Particles';
import { Reveal } from '@/components/landing/Reveal';
import { StepCarousel } from '@/components/landing/StepCarousel';
import { getT } from '@/lib/i18n/server';

const SKY = 'bg-[linear-gradient(180deg,var(--pj-hero-from),var(--pj-hero-to))]';
const ICON = { strokeWidth: 1.75 } as const;

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-9 w-fit items-center gap-2 rounded-pill border border-hairline bg-raised pr-4 pl-3 text-sm font-medium [&>svg]:size-4">
      {icon}
      {children}
    </span>
  );
}

function Title({ a, b, icon, className }: { a: string; b: string; icon?: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-h2 text-center text-balance ${className ?? ''}`}>
      <span className="text-foreground">{a}</span>
      {icon && (
        <span aria-hidden="true" className="mx-2 hidden sm:inline-flex size-[0.95em] translate-y-[0.08em] items-center justify-center rounded-inner bg-surface align-baseline [&>svg]:size-[0.5em]">
          {icon}
        </span>
      )}{' '}
      <span className="text-foreground/60">{b}</span>
    </h2>
  );
}

export default async function LandingPage() {
  const { t } = await getT();

  return (
    <>
      <MarketingNav revealAfterId="hero" />
      <main className="flex flex-col">
        {/* Hero: inset rounded frame with a soft sky (E1) and a decorative 3D node object (E2). */}
        <section id="hero" className="p-3">
          <div className={`relative isolate overflow-hidden rounded-card-lg ${SKY}`}>
            <Particles className="absolute inset-0 -z-10 size-full" />
            <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 pt-3 md:px-9">
              <Link href="/" aria-label={t('common.brand.name')} className="rounded-pill">
                <Logo size={30} wordmark />
              </Link>
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/#cara-kerja" className="pj-press inline-flex h-9 items-center rounded-pill px-4 text-sm font-medium text-foreground/80 hover:bg-white/50">
                  {t('shell.nav.howItWorks')}
                </Link>
                <Link href="/#fitur" className="pj-press inline-flex h-9 items-center rounded-pill px-4 text-sm font-medium text-foreground/80 hover:bg-white/50">
                  {t('shell.nav.features')}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <LocaleSwitch className="hidden md:inline-flex" />
                <Button variant="ghost" size="sm" render={<Link href="/auth/login" />} nativeButton={false}>
                  {t('common.action.signIn')}
                </Button>
                <Button size="sm" render={<Link href="/auth/register" />} nativeButton={false} className="max-sm:hidden">
                  {t('common.action.signUp')}
                </Button>
              </div>
            </div>

            <div className="pj-gutter mx-auto flex max-w-[1100px] flex-col items-center gap-8 pt-12 text-center md:pt-16">
              <h1 className="pj-rise text-display text-balance text-ink">
                {t('landing.hero.title.a')} <span className="text-ink/60">{t('landing.hero.title.b')}</span>
              </h1>
              <p style={{ '--pj-i': 1 } as React.CSSProperties} className="pj-rise max-w-[34rem] text-lg text-ink/80 md:text-xl">{t('landing.hero.sub')}</p>
              <div style={{ '--pj-i': 2 } as React.CSSProperties} className="pj-rise flex flex-col items-center gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/auth/register" />} nativeButton={false}>
                  {t('landing.cta.primary')}
                </Button>
              </div>
            </div>

            <div className="pj-gutter pt-10 pb-6 md:pt-12 md:pb-8">
              <HeroObject />
            </div>
          </div>
        </section>

        {/* How it works: heading with inline icon tile, then the step carousel. */}
        <section id="cara-kerja" className="scroll-mt-24 py-30 md:py-44">
          <div className="flex flex-col gap-14">
            <Reveal className="pj-gutter">
              <Title a={t('landing.how.title.a')} b={t('landing.how.title.b')} icon={<Route {...ICON} />} className="mx-auto max-w-[20ch]" />
            </Reveal>
            <Reveal delay={80}>
              <StepCarousel />
            </Reveal>
          </div>
        </section>

        {/* Features: two large cards with real product pieces (the animation stage and the concept map). */}
        <section id="fitur" className="scroll-mt-24 pb-30 md:pb-44">
          <div className="pj-gutter mx-auto flex max-w-[var(--pj-content-max)] flex-col gap-14">
            <Reveal>
              <Title a={t('landing.fitur.title.a')} b={t('landing.fitur.title.b')} className="mx-auto max-w-[22ch]" />
            </Reveal>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-9 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
              <Reveal>
                <article className="flex h-full flex-col gap-6 rounded-card-lg bg-surface p-6 md:p-9">
                  <Chip icon={<Waypoints {...ICON} />}>{t('landing.fitur.math.chip')}</Chip>
                  <h3 className="text-h3 max-w-[18ch]">{t('landing.fitur.math.title')}</h3>
                  <div className="rounded-inner bg-raised p-3">
                    <MathDemo />
                  </div>
                  <p className="text-base text-foreground/80">{t('landing.fitur.math.body')}</p>
                </article>
              </Reveal>
              <Reveal delay={80}>
                <article className="flex h-full flex-col gap-6 rounded-card-lg bg-surface p-6 md:p-9">
                  <Chip icon={<Network {...ICON} />}>{t('landing.fitur.map.chip')}</Chip>
                  <h3 className="text-h3 max-w-[18ch]">{t('landing.fitur.map.title')}</h3>
                  <div className="flex-1"><ConceptMap /></div>
                  <p className="text-base text-foreground/80">{t('landing.fitur.map.body')}</p>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Privacy: truthful summary of the legal pages, with links. */}
        <section id="privasi" className="scroll-mt-24 pb-30 md:pb-44">
          <div className="pj-gutter mx-auto max-w-[var(--pj-content-max)]">
            <Reveal>
              <div className="flex flex-col gap-10 rounded-card-lg bg-surface p-6 md:gap-14 md:p-12">
                <div className="flex max-w-[40rem] flex-col gap-4">
                  <Title a={t('landing.privacy.title.a')} b={t('landing.privacy.title.b')} className="!text-left" />
                  <p className="text-base text-foreground/80">{t('landing.privacy.intro')}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 md:gap-9">
                  {(
                    [
                      ['store', <Database key="d" {...ICON} />],
                      ['gemini', <Send key="s" {...ICON} />],
                      ['never', <ShieldOff key="n" {...ICON} />],
                      ['delete', <Trash2 key="t" {...ICON} />],
                    ] as const
                  ).map(([k, icon]) => (
                    <div key={k} className="flex flex-col gap-3 rounded-inner border border-hairline bg-raised p-5 md:p-6">
                      <span className="inline-flex size-10 items-center justify-center rounded-inner bg-surface [&>svg]:size-5">{icon}</span>
                      <h3 className="text-h4">{t(`landing.privacy.${k}.title`)}</h3>
                      <p className="text-base text-foreground/80">{t(`landing.privacy.${k}.body`)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" render={<Link href="/terms" />} nativeButton={false}>
                    {t('landing.privacy.link.terms')}
                  </Button>
                  <Button variant="secondary" render={<Link href="/privacy" />} nativeButton={false}>
                    {t('landing.privacy.link.privacy')}
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Closing: one pill button on the sky panel. */}
        <section className="px-3 pb-3">
          <div className={`relative overflow-hidden rounded-card-lg ${SKY} py-24 md:py-36`}>
            <div className="pj-gutter mx-auto flex max-w-[var(--pj-content-max)] flex-col items-center gap-10">
              <Reveal>
                <h2 className="text-h1 text-center text-balance text-ink">
                  {t('landing.close.title.a')} <span className="text-ink/60">{t('landing.close.title.b')}</span>
                </h2>
              </Reveal>
              <Button size="lg" render={<Link href="/auth/register" />} nativeButton={false}>
                {t('landing.cta.primary')}
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
