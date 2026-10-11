import { NextResponse } from 'next/server';
import { generateStructuredJSON } from '@/lib/ai/provider';
import { MOCK_DIAGNOSTIC_RESULT } from '@/lib/ai/mock-data';
import { createClient } from '@/lib/supabase/server';
import type { DiagnosticResult } from '@/types';

interface UserAnswerPayload {
  question_id: string;
  question: string;
  options: string[];
  selected_option: number; // 0-3
  concept_tested: string;
  correct_index?: number;
  explanation?: string;
  target_node_id?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic: string = body.topic || 'Struktur Data & Algoritma';
    const answers: UserAnswerPayload[] = body.answers || [];

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Daftar jawaban tidak boleh kosong' },
        { status: 400 }
      );
    }

    const total = answers.length;

    // 1. Deterministic Evaluation
    const hasKeys = answers.some(a => typeof a.correct_index === 'number');
    let deterministicCorrectCount = 0;
    const incorrectAnswers: UserAnswerPayload[] = [];
    const correctAnswers: UserAnswerPayload[] = [];

    if (hasKeys) {
      for (const a of answers) {
        if (typeof a.correct_index === 'number' && a.selected_option === a.correct_index) {
          deterministicCorrectCount++;
          correctAnswers.push(a);
        } else {
          incorrectAnswers.push(a);
        }
      }
    } else {
      // Legacy fallback if client provided no keys
      deterministicCorrectCount = Math.max(1, Math.floor(total * 0.5));
    }

    let diagnosticResult: DiagnosticResult | null = null;

    // 2. AI Qualitative Misconception & Narrative Synthesis
    try {
      const answersPromptText = answers.map((a, idx) => {
        const chosenText = a.options[a.selected_option] ?? 'Tidak dijawab';
        const correctText = typeof a.correct_index === 'number' ? a.options[a.correct_index] : 'Tidak diketahui';
        const isRight = typeof a.correct_index === 'number' ? a.selected_option === a.correct_index : 'Perlu evaluasi';

        return `Soal ${idx + 1}: "${a.question}"
- Konsep yang diuji: ${a.concept_tested} (ID: ${a.target_node_id || 'n/a'})
- Opsi pilihan: ${JSON.stringify(a.options)}
- Jawaban pengguna: Opsi index ${a.selected_option} ("${chosenText}")
- Kunci jawaban sebenarnya: Opsi index ${a.correct_index ?? -1} ("${correctText}")
- Status: ${isRight ? 'BENAR' : 'SALAH / PERLU PENINGKATAN'}`;
      }).join('\n\n');

      const prompt = `Analisis hasil pre-test diagnostik siswa untuk topik "${topic}".
Total Soal: ${total}
Jumlah Jawaban Benar (Deterministik): ${deterministicCorrectCount}

Berikut detail soal dan jawaban siswa:
${answersPromptText}

TUGAS AI:
1. Identifikasi konsep-konsep prasyarat yang paling lemah berdasarkan soal-soal yang salah.
2. Buat daftar "identified_gaps" dengan:
   - "concept": Nama konsep prasyarat (singkat, jelas)
   - "target_node_id": ID slug konsep jika tersedia dari soal
   - "severity": "critical" | "moderate" | "minor"
   - "justification": Penjelasan mengapa konsep ini fundamental untuk dipelajari
   - "prerequisites": Daftar konsep dasar pendukungnya
3. Buat "summary_narrative": Rangkuman pedagogis evaluatif yang empatik, konstruktif, dan memotivasi.

Kembalikan format JSON:
{
  "topic": "${topic}",
  "total_questions": ${total},
  "correct_count": ${deterministicCorrectCount},
  "identified_gaps": [
    {
      "concept": "Nama Konsep",
      "target_node_id": "slug-node",
      "severity": "critical",
      "justification": "Alasan pedagogis...",
      "prerequisites": ["Konsep A", "Konsep B"]
    }
  ],
  "summary_narrative": "Paragraf ringkasan evaluasi..."
}`;

      const systemInstruction = `Kamu adalah AI Diagnostic Engine Pijar yang mengkhususkan diri dalam deteksi Root Knowledge Gap dan Misconception. Berikan analisis pedagogis yang akurat dan empati. Kembalikan HANYA JSON valid.`;

      const aiResponse = await generateStructuredJSON<DiagnosticResult>(
        prompt,
        systemInstruction
      );

      if (aiResponse && Array.isArray(aiResponse.identified_gaps)) {
        diagnosticResult = {
          ...aiResponse,
          topic,
          total_questions: total,
          correct_count: deterministicCorrectCount,
        };
      }
    } catch (aiErr) {
      console.warn('AI diagnostic qualitative analysis failed, using deterministic fallback synthesis:', aiErr);
    }

    // 3. Robust Topic-Aware Fallback Synthesis if AI was unavailable
    if (!diagnosticResult) {
      const generatedGaps = incorrectAnswers.length > 0
        ? incorrectAnswers.map(a => ({
            concept: a.concept_tested,
            target_node_id: a.target_node_id,
            severity: 'critical' as const,
            justification: a.explanation || `Konsep "${a.concept_tested}" merupakan prasyarat fundamental yang perlu diperkuat agar kamu dapat memahami topik lanjutan dengan lancar.`,
            prerequisites: [a.concept_tested],
          }))
        : [
            {
              concept: `${topic} - Pemantapan Lanjutan`,
              target_node_id: undefined,
              severity: 'minor' as const,
              justification: 'Kamu telah menjawab soal diagnostik dengan sangat baik. Jalur kurikulum siap untuk materi tingkat lanjut.',
              prerequisites: [],
            },
          ];

      diagnosticResult = {
        topic,
        total_questions: total,
        correct_count: deterministicCorrectCount,
        identified_gaps: generatedGaps,
        summary_narrative: deterministicCorrectCount === total
          ? `Luar biasa! Kamu berhasil menjawab seluruh ${total} soal diagnostik untuk topik "${topic}" dengan tepat. Kurikulum belajarmu telah disesuaikan untuk melangkah langsung ke konsep lanjutan.`
          : `Dari hasil pre-test diagnostik topik "${topic}", kamu berhasil menjawab ${deterministicCorrectCount} dari ${total} soal. Pijar mendeteksi beberapa konsep prasyarat fundamental yang perlu diperkuat terlebih dahulu agar proses belajarmu lebih kokoh.`,
      };
    }

    // Optional: Log to Supabase diagnostic_logs if user session exists
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('diagnostic_logs').insert({
          user_id: user.id,
          topic,
          answers_json: answers,
          identified_gaps_json: diagnosticResult.identified_gaps,
        });
      }
    } catch (logErr) {
      console.warn('Failed to persist diagnostic log to Supabase (non-blocking):', logErr);
    }

    return NextResponse.json({
      success: true,
      result: diagnosticResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Gagal menganalisis diagnostik: ' + message },
      { status: 500 }
    );
  }
}
