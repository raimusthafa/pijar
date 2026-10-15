import { NextResponse } from 'next/server';
import {
  analyzeLearnerIntake,
  buildProceduralIntakeFallback,
} from '@/lib/diagnostic/engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawInput = (body.input || '').trim();

    if (!rawInput) {
      return NextResponse.json(
        { success: false, error: 'Teks input / curhatan tidak boleh kosong' },
        { status: 400 }
      );
    }

    let intakeResult;
    try {
      if (typeof analyzeLearnerIntake === 'function') {
        // A slow or rate-limited model must not leave the learner waiting: fall back to the procedural reading after 25s.
        intakeResult = await Promise.race([
          analyzeLearnerIntake(rawInput),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('intake timeout')), 25000)),
        ]);
      } else {
        intakeResult = buildProceduralIntakeFallback(rawInput);
      }
    } catch (analysisErr) {
      console.warn('AI intake analysis encountered an issue, falling back to procedural parser:', analysisErr);
      intakeResult = buildProceduralIntakeFallback(rawInput);
    }

    return NextResponse.json({
      success: true,
      intake: intakeResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error analyzing learner intake:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menganalisis input kebutuhan belajar: ' + message },
      { status: 500 }
    );
  }
}
