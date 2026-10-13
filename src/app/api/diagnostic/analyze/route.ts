import { NextResponse } from 'next/server';
import { generateStructuredJSON } from '@/lib/ai/provider';
import { createClient } from '@/lib/supabase/server';
import {
  evaluateDiagnosticAnswers,
  generateCurriculumGraph,
} from '@/lib/diagnostic/engine';
import { summarize } from '@/lib/diagnostic/adaptive';
import type {
  DiagnosticAnswer,
  DiagnosticResult,
  KnowledgeGap,
} from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic: string = (body.topic || 'Struktur Data & Algoritma').trim();
    const targetGoal: string = (body.target_goal || 'Persiapan Komprehensif').trim();
    const rawAnswers: DiagnosticAnswer[] = body.answers || [];
    const isPractitionerTrack = Boolean(body.is_practitioner_track) || targetGoal.toLowerCase().includes('mahir') || targetGoal.toLowerCase().includes('praktisi') || topic.toLowerCase().includes('praktisi');
    const intakeContext = body.intake_context;

    if (!Array.isArray(rawAnswers) || rawAnswers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Daftar jawaban tidak boleh kosong' },
        { status: 400 }
      );
    }

    // 1. Deterministic Evaluation with Metacognitive Confidence Matrix
    const evaluated = evaluateDiagnosticAnswers(rawAnswers);

    // 2. Qualitative AI Analysis for Misconceptions & Pedagogical Narrative
    let refinedGaps: KnowledgeGap[] = evaluated.derivedGaps;
    let summaryNarrative = '';

    try {
      const answersPromptText = evaluated.evaluatedAnswers
        .map((a, idx) => {
          const chosenText = a.options?.[a.selected_option] ?? 'Opsi ' + a.selected_option;
          const correctText =
            typeof a.correct_index === 'number' && a.options?.[a.correct_index]
              ? a.options[a.correct_index]
              : 'Index ' + (a.correct_index ?? -1);

          return `Soal ${idx + 1}: "${a.question || a.concept_tested}"
- Konsep yang Diuji: ${a.concept_tested} (ID: ${a.target_node_id || 'n/a'})
- Jawaban Siswa: "${chosenText}" (Tingkat Keyakinan: ${a.confidence_level || 'medium'})
- Kunci Jawaban: "${correctText}"
- Status: ${a.is_correct ? 'BENAR' : 'SALAH'}`;
        })
        .join('\n\n');

      const prompt = `Analisis hasil pre-test diagnostik siswa untuk topik "${topic}".
Sasaran Belajar Siswa: "${targetGoal}".
Total Soal: ${evaluated.total}
Skor Jawaban Benar: ${evaluated.correctCount} / ${evaluated.total}
Metriks Keyakinan:
- Miskonsepsi Kritis (Salah & Yakin Tinggi): ${evaluated.confidenceMatrix.misconceptions}
- Kesenjangan Belum Dipelajari (Salah & Ragu): ${evaluated.confidenceMatrix.regular_gaps}
- Pengetahuan Rapuh (Benar tapi Ragu): ${evaluated.confidenceMatrix.fragile}
- Penguasaan Kokoh (Benar & Yakin): ${evaluated.confidenceMatrix.solid}

Detail Jawaban Siswa:
${answersPromptText}

TUGAS AI:
1. Analisis konsep-konsep prasyarat yang paling lemah atau miskonsepsi aktif.
2. Buat daftar "identified_gaps":
   - "concept": Nama konsep
   - "target_node_id": slug ID
   - "severity": "critical" (untuk miskonsepsi/salah fatal) | "moderate" | "minor"
   - "justification": Alasan pedagogis mengapa konsep ini harus diperkuat
   - "prerequisites": Daftar konsep dasar pendukungnya
3. Buat "summary_narrative": Ringkasan pedagogis evaluatif yang empatik, tajam, dan memotivasi (2-3 paragraf).

Format JSON:
{
  "identified_gaps": [
    {
      "concept": "Nama Konsep",
      "target_node_id": "slug-id",
      "severity": "critical",
      "justification": "...",
      "prerequisites": ["Konsep Dasar"]
    }
  ],
  "summary_narrative": "..."
}`;

      const systemInstruction = `Kamu adalah Chief Diagnostic Psychologist di Pijar. Evaluasi hasil tes siswa dengan analisis akar miskonsepsi (Root Cause Analysis). Kembalikan HANYA JSON valid.`;

      const aiAnalysis = await generateStructuredJSON<{
        identified_gaps: KnowledgeGap[];
        summary_narrative: string;
      }>(prompt, systemInstruction);

      if (aiAnalysis?.identified_gaps && Array.isArray(aiAnalysis.identified_gaps)) {
        refinedGaps = aiAnalysis.identified_gaps;
        summaryNarrative = aiAnalysis.summary_narrative;
      }
    } catch (aiErr) {
      console.warn('AI qualitative narrative analysis failed, using structured fallback narrative:', aiErr);
    }

    if (!summaryNarrative) {
      if (evaluated.correctCount === evaluated.total) {
        summaryNarrative = `Luar biasa! Kamu berhasil menjawab seluruh ${evaluated.total} soal diagnostik untuk topik "${topic}" dengan akurasi 100%. Fondasi konsepmu sangat kokoh. Kurikulum Knowledge Graph kamu telah diinisialisasi agar kamu dapat langsung melompat ke konsep-konsep tingkat lanjut.`;
      } else {
        const misConceptNote = evaluated.confidenceMatrix.misconceptions > 0
          ? ` Terdapat ${evaluated.confidenceMatrix.misconceptions} area di mana kamu sangat yakin namun menghasilkan kesimpulan yang kurang tepat—ini adalah miskonsepsi aktif yang akan kita luruskan.`
          : '';

        summaryNarrative = `Dari hasil pre-test diagnostik topik "${topic}", kamu berhasil menjawab ${evaluated.correctCount} dari ${evaluated.total} soal dengan tepat.${misConceptNote} Pijar telah mengidentifikasi konsep-konsep prasyarat yang perlu diperkuat agar proses belajarmu tidak terhambat di materi lanjutan.`;
      }
    }

    // 3. ZERO-MOCK DYNAMIC KNOWLEDGE GRAPH SYNTHESIS
    // Generate an authentic DAG specifically created for this topic and this user's gaps!
    const generatedGraph = await generateCurriculumGraph({
      topic,
      targetGoal,
      evaluatedResult: {
        ...evaluated,
        derivedGaps: refinedGaps,
      },
      isPractitionerTrack,
    });

    let graphId: string = crypto.randomUUID();
    let isPersistedInCloud = false;

    // 4. SUPABASE PERSISTENCE (Store real graph & logs)
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Insert learning graph
        const { data: dbGraph, error: graphErr } = await supabase
          .from('learning_graphs')
          .insert({
            user_id: user.id,
            topic,
            nodes_json: generatedGraph.nodes,
            edges_json: generatedGraph.edges,
            status: 'active',
          })
          .select('id')
          .single();

        if (dbGraph && !graphErr) {
          graphId = dbGraph.id;
          isPersistedInCloud = true;

          // Insert diagnostic logs
          await supabase.from('diagnostic_logs').insert({
            user_id: user.id,
            topic,
            answers_json: evaluated.evaluatedAnswers,
            identified_gaps_json: refinedGaps,
          });

          // Insert initial node progress
          const progressRows = generatedGraph.nodes.map((node) => ({
            user_id: user.id,
            graph_id: graphId,
            node_id: node.id,
            status: node.status,
            score: node.status === 'completed' ? 100 : 0,
          }));

          await supabase.from('node_progress').insert(progressRows);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase graph persistence notice (operating in local session mode):', dbErr);
    }

    const finalResult: DiagnosticResult = {
      topic,
      total_questions: evaluated.total,
      correct_count: evaluated.correctCount,
      confidence_matrix: evaluated.confidenceMatrix,
      identified_gaps: refinedGaps,
      summary_narrative: summaryNarrative,
      graph_id: graphId,
      nodes: generatedGraph.nodes,
      edges: generatedGraph.edges,
      mode: evaluated.total >= 10 ? 'comprehensive' : 'quick',
      intake_context: intakeContext,
    };

    return NextResponse.json({
      success: true,
      result: finalResult,
      graph: {
        id: graphId,
        topic,
        nodes: generatedGraph.nodes,
        edges: generatedGraph.edges,
        persisted: isPersistedInCloud,
      },
      adaptive: body.adaptive_state ? summarize(body.adaptive_state) : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error analyzing diagnostic answers:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menganalisis jawaban diagnostik: ' + message },
      { status: 500 }
    );
  }
}
