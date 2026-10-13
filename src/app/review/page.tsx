import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { AppShell, PageBody, PageHeader } from '@/components/shell/AppShell';
import { ReviewSession } from '@/components/review/ReviewSession';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReviewPage({ searchParams }: { searchParams: Promise<{ graphId?: string }> }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageBody width="narrow" className="grid gap-4 pt-8">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-72 rounded-card" />
          </PageBody>
        </AppShell>
      }
    >
      <ReviewContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReviewContent({ searchParams }: { searchParams: Promise<{ graphId?: string }> }) {
  await connection();
  const { graphId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const [{ t }, { data: profile }] = await Promise.all([
    getT(),
    supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
  ]);

  return (
    <AppShell user={{ name: profile?.name, email: user.email }} title={t('review.title')}>
      <PageHeader width="narrow" title={t('review.title')} description={t('review.lead')} />
      <PageBody width="narrow">
        <ReviewSession graphId={graphId} />
      </PageBody>
    </AppShell>
  );
}
