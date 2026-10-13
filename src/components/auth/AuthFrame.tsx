import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { LegalConsent } from '@/components/shell/LegalConsent';
import { Skeleton } from '@/components/ui/skeleton';

/** Calm centered frame for the auth pages: logo, locale switch, one surface card, legal consent underneath. */
export function AuthFrame({
  children,
  consent = true,
  wide = false,
  above,
}: {
  children: React.ReactNode;
  consent?: boolean;
  wide?: boolean;
  /** Sits above the card at the card's width (step indicator on onboarding). */
  above?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-ground">
      <header className="pj-gutter flex h-16 items-center justify-between">
        <Link href="/" aria-label="Pijar" className="rounded-control">
          <Logo wordmark size={26} />
        </Link>
        <LocaleSwitch />
      </header>
      <div className={`pj-gutter flex flex-1 flex-col items-center pb-16 pt-6 ${wide ? "md:pt-12" : "justify-center"}`}>
        <div className={wide ? 'w-full max-w-xl' : 'w-full max-w-md'}>
          {above}
          <div className="pj-rise rounded-card bg-surface p-6 md:p-9">{children}</div>
        </div>
        {consent && <LegalConsent className="mt-6 max-w-sm text-center text-xs text-muted-foreground" />}
      </div>
    </main>
  );
}

/** Same footprint as the form so the card does not jump when the search params resolve. */
export function AuthSkeleton() {
  return (
    <AuthFrame consent={false}>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <div className="mt-8 space-y-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full rounded-pill" />
      </div>
    </AuthFrame>
  );
}
