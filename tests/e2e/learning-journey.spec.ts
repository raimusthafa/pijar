import { test, expect } from '@playwright/test';

test.describe('Pijar E2E F4 Learning Journey & Quiz Evaluation Suite', () => {
  test('API /api/learn/material returns structured concept material with video plan', async ({ request }) => {
    const res = await request.post('/api/learn/material', {
      data: {
        nodeId: 'rekursi',
        topic: 'Algoritma & Struktur Data',
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.material).toBeDefined();

    // Verify pedagogical structure
    expect(json.material.nodeId).toBe('rekursi');
    expect(json.material.title).toContain('Rekursi');
    expect(json.material.analogy).toBeTruthy();
    expect(json.material.keyTakeaways.length).toBeGreaterThan(0);
    expect(json.material.examples.length).toBeGreaterThan(0);
    expect(json.material.examples[0].code).not.toContain('function solve(input: number): boolean');

    // Verify video script plan
    expect(json.material.videoScript).toBeDefined();
    expect(json.material.videoScript.scenes.length).toBeGreaterThan(0);
    expect(json.material.videoScript.totalDurationSeconds).toBeGreaterThan(0);

    // Verify checkpoint quiz
    expect(json.material.checkpointQuestions).toBeDefined();
    expect(json.material.checkpointQuestions.length).toBeGreaterThan(0);
  });

  test('API /api/learn/evaluate-quiz grades correct answers with 100% and unlocks mastery', async ({ request }) => {
    // 1. Fetch material for 'rekursi'
    const matRes = await request.post('/api/learn/material', {
      data: { nodeId: 'rekursi', topic: 'Algoritma & Struktur Data' },
    });
    const { material } = await matRes.json();
    const questions = material.checkpointQuestions;

    // Build 100% correct answers map
    const correctAnswers: Record<string, number> = {};
    for (const q of questions) {
      correctAnswers[q.id] = q.correctIndex;
    }

    // 2. Evaluate answers
    const evalRes = await request.post('/api/learn/evaluate-quiz', {
      data: {
        nodeId: 'rekursi',
        answers: correctAnswers,
      },
    });

    expect(evalRes.status()).toBe(200);
    const evalJson = await evalRes.json();
    expect(evalJson.success).toBe(true);
    expect(evalJson.result.isPassed).toBe(true);
    expect(evalJson.result.score).toBe(100);
    expect(evalJson.result.totalQuestions).toBe(questions.length);
  });

  test('API /api/learn/evaluate-quiz catches misconceptions on incorrect answers', async ({ request }) => {
    // 1. Fetch material for 'rekursi'
    const matRes = await request.post('/api/learn/material', {
      data: { nodeId: 'rekursi', topic: 'Algoritma & Struktur Data' },
    });
    const { material } = await matRes.json();
    const questions = material.checkpointQuestions;

    // Pick intentionally incorrect index for each question
    const incorrectAnswers: Record<string, number> = {};
    for (const q of questions) {
      incorrectAnswers[q.id] = (q.correctIndex + 1) % q.options.length;
    }

    // 2. Evaluate incorrect answers
    const evalRes = await request.post('/api/learn/evaluate-quiz', {
      data: {
        nodeId: 'rekursi',
        answers: incorrectAnswers,
      },
    });

    expect(evalRes.status()).toBe(200);
    const evalJson = await evalRes.json();
    expect(evalJson.success).toBe(true);
    expect(evalJson.result.isPassed).toBe(false);
    expect(evalJson.result.score).toBe(0);
    expect(evalJson.result.questionResults.length).toBeGreaterThan(0);
    expect(evalJson.result.questionResults[0].explanation).toBeTruthy();
  });

  test('API /api/learn/evaluate-quiz rejects invalid payloads fail-closed', async ({ request }) => {
    const res = await request.post('/api/learn/evaluate-quiz', {
      data: {}, // Missing required parameters
    });
    expect(res.status()).toBe(400);
  });
});
