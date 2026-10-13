import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { AppShell, PageBody } from '@/components/shell/AppShell';
import { DiagnosticFlow } from '@/components/diagnostic/DiagnosticFlow';
import { QuestionSkeleton } from '@/components/diagnostic/Skeletons';

type SP = Promise<{ topic?: string }>;

export default function DiagnosticPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageBody width="narrow" className="pt-10">
            <QuestionSkeleton />
          </PageBody>
        </AppShell>
      }
    >
      <DiagnosticContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DiagnosticContent({ searchParams }: { searchParams: SP }) {
  await connection();
  const { topic } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ t }, profile] = await Promise.all([
    getT(),
    user ? supabase.from('profiles').select('name').eq('id', user.id).maybeSingle() : null,
  ]);

  return (
    <AppShell user={user ? { name: profile?.data?.name, email: user.email } : undefined} title={t('diagnostic.title')}>
      <PageBody className="pt-8">
        <DiagnosticFlow topicParam={topic} />
      </PageBody>
    </AppShell>
  );
}
