import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, nextPhase, isLast, phasePrompt } from '../src/lib/workspace/five-e.ts';

test('five-e phases advance and stop at evaluate', () => {
  assert.deepEqual(PHASES, ['engage', 'explore', 'explain', 'elaborate', 'evaluate']);
  assert.equal(nextPhase('engage'), 'explore');
  assert.equal(nextPhase('evaluate'), 'evaluate');
  assert.equal(isLast('evaluate'), true);
  assert.equal(isLast('explain'), false);
});

test('prompts exist per phase and language, mention concept, no em dash', () => {
  for (const language of ['id', 'en']) for (const p of PHASES) {
    const t = phasePrompt(p, { concept: 'Rekursi', language });
    assert.ok(t.includes('Rekursi'));
    assert.ok(!t.includes('—'));
  }
  assert.match(phasePrompt('explore', { concept: 'x', language: 'en' }), /Never give the answer/);
  assert.match(phasePrompt('explore', { concept: 'x' }), /Jangan pernah memberi jawaban/);
});
