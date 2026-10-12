import { NextResponse } from 'next/server';
import { analyzeLearnerIntake } from '@/lib/diagnostic/engine';

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

    const intakeResult = await analyzeLearnerIntake(rawInput);

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
