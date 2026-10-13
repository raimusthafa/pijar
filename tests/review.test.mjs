import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { retention, isDue, applyReview, pickDailyReview } from '../src/lib/scheduler/engine.ts';
import { isMastered, MASTERY_THRESHOLD } from '../src/lib/mastery/engine.ts';
import { validateQuestion, fallbackQuestions, bankTopic } from '../src/lib/learn/question-bank.ts';

const now = new Date('2026-10-13T00:00:00Z');
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const row = (node_id, days, stability = 1, status = 'completed') => ({ node_id, status, last_reviewed_at: ago(days), stability_days: stability });

describe('review (Ebbinghaus)', () => {
  test('retention decays and is due below 0.7', () => {
    assert.ok(Math.abs(retention(row('a', 1), now) - Math.exp(-1)) < 1e-9);
    assert.equal(isDue(row('a', 0.2), now), false);
    assert.equal(isDue(row('a', 1), now), true);
  });
  test('stability x2.2 capped at 60, halves on failure with floor 1, count increments', () => {
    assert.equal(applyReview({ node_id: 'a', status: 'completed', stability_days: 2 }, true, now).stability_days, 4.4);
    assert.equal(applyReview({ node_id: 'a', status: 'completed', stability_days: 50 }, true, now).stability_days, 60);
    const f = applyReview({ node_id: 'a', status: 'completed', stability_days: 1, review_count: 2 }, false, now);
    assert.equal(f.stability_days, 1);
    assert.equal(f.review_count, 3);
  });
  test('picks most decayed first, max 5, completed only', () => {
    const rows = [row('x', 2), row('y', 5), row('z', 1), row('n', 9, 1, 'in_progress'), ...[1, 2, 3, 4].map(i => row('p' + i, 3 + i))];
    const p = pickDailyReview(rows, now, 5).map(r => r.node_id);
    assert.equal(p.length, 5);
    assert.ok(!p.includes('n'));
    assert.equal(p[0], 'p4'); // 7 days
  });
  test('fallbacks when nothing is due', () => {
    const rows = [row('fresh', 0.1, 30), row('goal', 0.1, 30, 'in_progress')];
    assert.deepEqual(pickDailyReview(rows, now, 5, 'goal').map(r => r.node_id), ['goal', 'fresh']);
    assert.deepEqual(pickDailyReview([row('a', 0.1, 30)], now).map(r => r.node_id), ['a']);
    assert.deepEqual(pickDailyReview([], now), []);
  });
});

describe('mastery rule', () => {
  test('must exceed 70', () => {
    assert.equal(MASTERY_THRESHOLD, 70);
    assert.equal(isMastered(70), false);
    assert.equal(isMastered(71), true);
  });
});

describe('question bank pure parts', () => {
  test('validateQuestion', () => {
    const ok = { id: 'q', question: 'Q?', options: ['a', 'b'], correctIndex: 1, explanation: 'e' };
    assert.equal(validateQuestion(ok), true);
    assert.equal(validateQuestion({ ...ok, correctIndex: 2 }), false);
    assert.equal(validateQuestion({ ...ok, options: ['a'] }), false);
    assert.equal(validateQuestion({ ...ok, explanation: '' }), false);
  });
  test('fallback is always valid and respects language', () => {
    const qs = fallbackQuestions({ topic: 't', nodeId: 'zzz', label: 'Rekursi', difficulty: 'easy', count: 3, language: 'en' });
    assert.equal(qs.length, 3);
    assert.ok(qs.every(validateQuestion));
    assert.match(qs[0].question, /Which statement/);
  });
});

describe('question bank language key', () => {
  test('English gets its own bank, Indonesian keeps the legacy key', () => {
    assert.equal(bankTopic('Front End', 'id'), 'Front End');
    assert.equal(bankTopic('Front End'), 'Front End');
    assert.notEqual(bankTopic('Front End', 'en'), bankTopic('Front End', 'id'));
    assert.equal(bankTopic('Front End', 'en'), 'Front End [en]');
  });
});
