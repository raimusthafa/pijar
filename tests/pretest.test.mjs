import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { initAdaptive, answerAdaptive, currentItem, isDone, summarize, MAX_QUESTIONS } from '../src/lib/diagnostic/adaptive.ts';

const n = (id) => ({ id, label: id, category: 'x', description: '', status: 'ready', estimated_minutes: 10, is_gap: false });
// a <- b <- c <- d <- e (a is deepest prerequisite of goal e? no: edges source->target, source is prereq)
const nodes = ['a', 'b', 'c', 'd', 'e'].map(n);
const edges = [['a','b'],['b','c'],['c','d'],['d','e']].map(([source, target], i) => ({ id: 'e' + i, source, target }));
const run = (s, fn) => { while (!isDone(s)) s = answerAdaptive(s, fn(currentItem(s)), nodes, edges); return s; };

describe('adaptive pretest', () => {
  test('correct answers escalate to hard and master the goal without expanding', () => {
    const s = run(initAdaptive('e'), () => true);
    assert.deepEqual(s.answers.map(a => a.level), ['medium', 'hard']);
    assert.equal(summarize(s).startNodeId, 'e');
    assert.deepEqual(summarize(s).gaps, []);
  });
  test('wrong answers go easier and expand to at most 2 prerequisite levels', () => {
    const s = run(initAdaptive('e'), () => false);
    const tested = new Set(s.answers.map(a => a.nodeId));
    assert.deepEqual([...tested].sort(), ['c', 'd', 'e']);
    assert.ok(s.answers.some(a => a.nodeId === 'e' && a.level === 'easy'));
    assert.equal(summarize(s).startNodeId, 'c'); // deepest unmastered
  });
  test('never asks more than the cap', () => {
    const s = run(initAdaptive('e'), (i) => i.level === 'easy');
    assert.ok(s.answers.length <= MAX_QUESTIONS);
  });
  test('deep prerequisite is the start node when only it is weak', () => {
    const s = run(initAdaptive('e'), (i) => i.nodeId === 'e' ? i.level === 'easy' : i.nodeId !== 'd');
    assert.equal(summarize(s).startNodeId, 'd');
  });
});
