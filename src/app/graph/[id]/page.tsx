'use client';

import { use, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface DynamicGraphRouteProps {
  params: Promise<{ id: string }>;
}

export default function DynamicGraphRoute({ params }: DynamicGraphRouteProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <DynamicGraphContent params={params} />
    </Suspense>
  );
}

function DynamicGraphContent({ params }: DynamicGraphRouteProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/graph?id=${encodeURIComponent(id)}`);
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );
}
