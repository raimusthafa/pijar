'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

type NavLink = { href: string; label: string };

/**
 * Floating pill navbar (Letters style) for public pages.
 * `revealAfterId`: id of the hero element. The pill stays hidden while that element is on screen
 * and slides in once it has scrolled away. Leave it out and the pill is always visible.
 * `links` replaces the default anchors (#cara-kerja is "how it works", #fitur is "features"):
 * the landing page must have those ids or pass its own links.
 * `signedIn` swaps the sign in and sign up buttons for a dashboard button.
 */
export function MarketingNav({
  revealAfterId,
  links,
  signedIn = false,
}: {
  revealAfterId?: string;
  links?: NavLink[];
  signedIn?: boolean;
}) {
  const { t } = useT();
  const [visible, setVisible] = useState(!revealAfterId);

  useEffect(() => {
    if (!revealAfterId) return;
    const hero = document.getElementById(revealAfterId);
    if (!hero) return void queueMicrotask(() => setVisible(true));
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    io.observe(hero);
    return () => io.disconnect();
  }, [revealAfterId]);

  const items = links ?? [
    { href: '/#cara-kerja', label: t('shell.nav.howItWorks') },
    { href: '/#fitur', label: t('shell.nav.features') },
  ];

  return (
    <header
      inert={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 transition-[opacity,transform] duration-300 ease-out-pj motion-reduce:transition-opacity',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 motion-reduce:translate-y-0',
      )}
    >
      <nav
        aria-label={t('shell.nav.primary')}
        className="pj-glass pointer-events-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 rounded-pill border border-hairline pr-2 pl-5 md:grid md:grid-cols-[1fr_auto_1fr]"
      >
        <Link href="/" aria-label={t('common.brand.name')} className="rounded-pill md:justify-self-start">
          <Logo size={26} wordmark />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {items.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="pj-press inline-flex h-9 items-center rounded-pill px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1 md:flex md:justify-self-end">
          <LocaleSwitch />
          {signedIn ? (
            <Button size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
              {t('shell.nav.dashboard')}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" render={<Link href="/auth/login" />} nativeButton={false}>
                {t('common.action.signIn')}
              </Button>
              <Button size="sm" render={<Link href="/auth/register" />} nativeButton={false}>
                {t('common.action.signUp')}
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" aria-label={t('shell.nav.open')} />}
          >
            <Menu strokeWidth={1.75} />
          </SheetTrigger>
          <SheetContent side="top" className="gap-1 p-3">
            <SheetTitle className="sr-only">{t('shell.nav.primary')}</SheetTitle>
            {items.map((l) => (
              <SheetClose
                key={l.href}
                render={<Link href={l.href} />}
                nativeButton={false}
                className="flex h-12 items-center rounded-inner px-4 text-base font-medium hover:bg-hover"
              >
                {l.label}
              </SheetClose>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
              <LocaleSwitch />
              <div className="ml-auto flex gap-2">
                {signedIn ? (
                  <Button render={<Link href="/dashboard" />} nativeButton={false}>
                    {t('shell.nav.dashboard')}
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" render={<Link href="/auth/login" />} nativeButton={false}>
                      {t('common.action.signIn')}
                    </Button>
                    <Button render={<Link href="/auth/register" />} nativeButton={false}>
                      {t('common.action.signUp')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
