'use client';

// TEMPORARY review harness (deleted when the review ends): /dev-stage?r=derivative-tangent,pipeline&p=[{"expr":"sin(x)"},{}]
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { InteractiveVideoPlayer } from '@/components/learn/InteractiveVideoPlayer';
import { InteractiveBoard } from '@/components/learn/board/InteractiveBoard';
import { boardFromRecipe, type BoardRecipe } from '@/lib/learn/board-spec';

function Harness() {
  const q = useSearchParams();
  const names = (q.get('r') ?? 'derivative-tangent').split(',');
  const params = useMemo(() => {
    try {
      return JSON.parse(q.get('p') ?? '[]') as Record<string, unknown>[];
    } catch {
      return [];
    }
  }, [q]);
  const script = {
    conceptId: 'dev',
    title: 'Dev',
    totalDurationSeconds: 15 * names.length,
    scenes: names.map((n, i) => ({
      id: `s${i + 1}`,
      sceneNumber: i + 1,
      title: q.get('t') === '0' ? '' : n,
      durationSeconds: 15,
      narration: 'Narasi uji untuk memeriksa panggung animasi dan teks yang cukup panjang untuk satu kalimat.',
      captions: [
        { startSeconds: 0, endSeconds: 7, text: 'Kurva biru adalah $f(x) = \\sin(x)$.' },
        { startSeconds: 7, endSeconds: 15, text: 'Garis singgung menunjukkan kemiringan.' },
      ],
      recipe: { name: n, params: params[i] ?? {} },
    })),
  };
  const board = q.get('b');
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <InteractiveVideoPlayer script={script} />
      {board && <InteractiveBoard spec={boardFromRecipe(board as BoardRecipe, params[0] ?? {}, 'id')} />}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Harness />
    </Suspense>
  );
}
