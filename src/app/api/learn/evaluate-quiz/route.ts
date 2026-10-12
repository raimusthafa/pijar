import { NextResponse } from 'next/server';
import { getOrGenerateMaterial } from '@/lib/learn/generator';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredJSON } from '@/lib/ai/provider';
import type { QuizEvaluationResult } from '@/lib/learn/types';
import type { CurriculumNode, CurriculumEdge } from '@/types';
import { buildAdjacencyMaps } from '@/lib/graph/engine';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      topic = 'dsa',
      nodeId,
      graphId,
      answers = {}, // { [questionId]: selectedIndex }
      nodes = [],   // optional client graph snapshot
      edges = [],   // optional client graph snapshot
    } = body;

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Parameter nodeId wajib diisi' },
        { status: 400 }
      );
    }

    // 1. Load authoritative questions for this concept
    const material = await getOrGenerateMaterial({ topic, nodeId });
    const questions = material.checkpointQuestions || [];

    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada pertanyaan checkpoint untuk konsep ini' },
        { status: 404 }
      );
    }

    // 2. Deterministic Server-Side Evaluation
    let correctCount = 0;
    const questionResults: QuizEvaluationResult['questionResults'] = [];
    const incorrectForAI: Array<{
      question: string;
      chosenOption: string;
      correctOption: string;
      conceptTested: string;
    }> = [];

    for (const q of questions) {
      const userSelected = answers[q.id];
      const hasAnswer = typeof userSelected === 'number';
      const isCorrect = hasAnswer && userSelected === q.correctIndex;

      if (isCorrect) {
        correctCount++;
      } else if (hasAnswer && q.options[userSelected]) {
        incorrectForAI.push({
          question: q.question,
          chosenOption: q.options[userSelected],
          correctOption: q.options[q.correctIndex],
          conceptTested: q.conceptTested,
        });
      }

      const distractorExplanation =
        hasAnswer && q.distractorExplanations && q.distractorExplanations[userSelected]
          ? q.distractorExplanations[userSelected]
          : undefined;

      questionResults.push({
        questionId: q.id,
        userSelected: hasAnswer ? userSelected : -1,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        userExplanation: distractorExplanation,
        misconceptionFeedback: !isCorrect && hasAnswer
          ? distractorExplanation || `Kamu memilih opsi tersebut karena mengira konsep ini beroperasi tanpa dependensi. Padahal, jawaban tepatnya adalah: "${q.options[q.correctIndex]}".`
          : undefined,
      });
    }

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = score >= 65; // At least 2 of 3 (67%) or 1 of 1 (100%)

    // 3. AI Cognitive Misconception Enrichment (if errors occurred)
    if (incorrectForAI.length > 0) {
      try {
        const aiPrompt = `Siswa salah menjawab soal pada materi "${material.title}" (${topic}):
${JSON.stringify(incorrectForAI, null, 2)}

Buatkan analisis kognitif singkat (2-3 kalimat per soal) yang empatik dan meluruskan cara berpikir (cognitive debiasing) siswa mengapa mereka bisa terjebak memilih opsi salah tersebut dan bagaimana pola pikir yang benar.

Format output JSON:
{
  "feedback_list": [
    { "conceptTested": "nama", "feedback": "Penjelasan meluruskan..." }
  ],
  "summary": "Ringkasan motivatif singkat..."
}`;

        const aiFeedback = await generateStructuredJSON<{
          feedback_list: Array<{ conceptTested: string; feedback: string }>;
          summary: string;
        }>(aiPrompt, 'Kamu adalah AI Pedagogis Pijar yang mengkhususkan diri dalam Cognitive Misconception Debiasing. Berikan umpan balik yang empatik dan jelas.');

        if (aiFeedback?.feedback_list) {
          for (const item of aiFeedback.feedback_list) {
            const target = questionResults.find(
              qr => !qr.isCorrect && qr.misconceptionFeedback && qr.questionId.includes(nodeId)
            );
            if (target && item.feedback) {
              target.misconceptionFeedback = item.feedback;
            }
          }
        }
      } catch (aiErr) {
        // Fallback already assigned in loop above
      }
    }

    // 4. Calculate newly unlocked concepts (if passed)
    const unlockedNodeIds: string[] = [];
    if (isPassed && Array.isArray(nodes) && Array.isArray(edges) && nodes.length > 0) {
      try {
        const { dependentsMap, prerequisitesMap } = buildAdjacencyMaps(nodes as CurriculumNode[], edges as CurriculumEdge[]);
        const downstream = dependentsMap.get(nodeId) || [];

        // Currently mastered set + this newly passed node
        const completedSet = new Set(
          (nodes as CurriculumNode[])
            .filter(n => n.status === 'completed')
            .map(n => n.id)
        );
        completedSet.add(nodeId);

        for (const childId of downstream) {
          const childPrereqs = prerequisitesMap.get(childId) || [];
          const allMet = childPrereqs.every(p => completedSet.has(p));
          if (allMet) {
            unlockedNodeIds.push(childId);
          }
        }
      } catch (graphErr) {
        console.warn('Failed to compute downstream unlocked nodes:', graphErr);
      }
    }

    // 5. Persist progress to Supabase if authenticated
    if (user && graphId && graphId !== 'demo-graph' && isPassed) {
      try {
        await supabase
          .from('node_progress')
          .upsert({
            user_id: user.id,
            graph_id: graphId,
            node_id: nodeId,
            status: 'completed',
            score,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,graph_id,node_id' });
      } catch (dbErr) {
        console.warn('Supabase node progress persistence skipped:', dbErr);
      }
    }

    const summaryFeedback = isPassed
      ? `Selamat! Kamu berhasil menguasai konsep "${material.title}" dengan skor ${score}%. ${
          unlockedNodeIds.length > 0
            ? `${unlockedNodeIds.length} konsep lanjutan kini telah terbuka di Knowledge Graph!`
            : 'Kamu dapat melanjutkan ke konsep berikutnya.'
        }`
      : `Kamu memperoleh skor ${score}%. Masih ada beberapa kesalahpahaman konsep yang perlu diperkuat. Tinjau kembali materi di atas dan coba lagi!`;

    const result: QuizEvaluationResult = {
      score,
      totalQuestions,
      isPassed,
      questionResults,
      unlockedNodeIds,
      summaryFeedback,
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error evaluating checkpoint quiz:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal mengevaluasi kuis: ' + msg },
      { status: 500 }
    );
  }
}
