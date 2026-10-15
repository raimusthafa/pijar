'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarCheck,
  House,
  Menu,
  Network,
  PencilRuler,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { UserMenu, type ShellUser } from '@/components/shell/UserMenu';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

/** The only place that lists app navigation. Community lives inside the dashboard, learning inside the workspace. */
export const APP_NAV: { href: string; labelKey: MessageKey; icon: LucideIcon }[] = [
  { href: '/dashboard', labelKey: 'shell.nav.dashboard', icon: House },
  { href: '/graph', labelKey: 'shell.nav.map', icon: Network },
  { href: '/review', labelKey: 'shell.nav.review', icon: CalendarCheck },
  { href: '/workspace', labelKey: 'shell.nav.workspace', icon: PencilRuler },
];

function NavList({ onNavigate }: { onNavigate?: boolean }) {
  const { t } = useT();
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1.5">
      {APP_NAV.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const props = {
          href,
          'aria-current': active ? ('page' as const) : undefined,
          className: cn(
            'pj-press flex h-11 items-center gap-3 rounded-pill px-4 text-sm transition-colors duration-150',
            active
              ? 'bg-action text-action-foreground font-medium'
              : 'text-muted-foreground hover:bg-hover hover:text-foreground',
          ),
        };
        const content = (
          <>
            <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t(labelKey)}
          </>
        );
        return (
          <li key={href}>
            {onNavigate ? (
              <SheetClose render={<Link {...props} />} nativeButton={false}>
                {content}
              </SheetClose>
            ) : (
              <Link {...props}>{content}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Signed-in shell. Left: logo and navigation on the chrome tone. Right: thin topbar, then the content
 * in a rounded ground-tone panel with a small inset. Below md the sidebar becomes a sheet.
 * `title` fills the topbar title slot, `actions` sits left of the language switch.
 *
 *   <AppShell user={{ name, email }} title="Peta Belajar">{page}</AppShell>
 */
export function AppShell({
  user,
  title,
  actions,
  children,
}: {
  user?: ShellUser;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="flex h-dvh bg-surface">
      <a
        href="#main"
        className="fixed top-2 left-2 z-50 -translate-y-16 rounded-pill bg-action px-4 py-2 text-sm text-action-foreground focus:translate-y-0"
      >
        {t('shell.skip.content')}
      </a>

      <aside className="hidden w-(--pj-sidebar-w) shrink-0 flex-col gap-8 px-3 py-4 md:flex">
        <Link href="/dashboard" aria-label={t('common.brand.name')} className="w-fit rounded-pill px-2">
          <Logo size={32} wordmark />
        </Link>
        <nav aria-label={t('shell.nav.primary')}>
          <NavList />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 px-2 md:h-(--pj-topbar-h) md:px-1">
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" aria-label={t('shell.nav.open')} />}
            >
              <Menu strokeWidth={1.75} />
            </SheetTrigger>
            <SheetContent side="left" className="gap-8 px-3 py-4">
              <SheetTitle className="sr-only">{t('shell.nav.primary')}</SheetTitle>
              <Logo size={32} wordmark className="px-2" />
              <nav aria-label={t('shell.nav.primary')}>
                <NavList onNavigate />
              </nav>
              <LocaleSwitch className="mt-auto w-fit sm:hidden" />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1 truncate text-sm font-medium">{title}</div>
          {actions}
          <LocaleSwitch className="hidden sm:inline-flex" />
          <UserMenu user={user} />
        </header>

        <main
          id="main"
          className="mx-2 mb-2 min-h-0 flex-1 overflow-y-auto rounded-card border border-hairline bg-background md:mr-2 md:ml-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

const frame = 'mx-auto w-full px-5 md:px-8';
const widths = { default: 'max-w-[var(--pj-content-max)]', narrow: 'max-w-3xl', full: 'max-w-none' };

/** Title block at the top of a page. Same width options as PageBody so they line up. */
export function PageHeader({
  title,
  description,
  actions,
  width = 'default',
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  width?: keyof typeof widths;
  className?: string;
}) {
  return (
    <div className={cn(frame, widths[width], 'flex flex-wrap items-start justify-between gap-4 pt-8 pb-6', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-h3 font-semibold">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Content column under PageHeader. `narrow` is for reading pages, `full` for canvases. */
export function PageBody({
  width = 'default',
  className,
  children,
}: {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(frame, widths[width], 'pb-12', className)}>{children}</div>;
}
