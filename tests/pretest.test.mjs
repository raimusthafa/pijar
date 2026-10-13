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

import { pickGoalNode, applyAdaptiveStatuses, gapDetail } from '../src/lib/diagnostic/adaptive-graph.ts';

describe('adaptive graph glue', () => {
  test('goal is the sink with the most prerequisites', () => {
    assert.equal(pickGoalNode(nodes, edges), 'e');
    const branched = [...nodes, n('x')];
    assert.equal(pickGoalNode(branched, edges), 'e'); // x is a sink with no prerequisites
  });
  test('statuses: gaps flagged, mastered plus ancestors completed, rest ready or locked', () => {
    const out = applyAdaptiveStatuses(nodes, edges, { startNodeId: 'c', gaps: [{ nodeId: 'c', depth: 2, reason: 'wrong_easy' }], mastered: ['d'] });
    const st = Object.fromEntries(out.map(x => [x.id, x.status]));
    // d mastered, but its prerequisite c is a gap: c stays a gap, a and b (ancestors) complete
    assert.deepEqual(st, { a: 'completed', b: 'completed', c: 'prerequisite_gap', d: 'completed', e: 'ready' });
  });
  test('gapDetail picks the first failed check', () => {
    const a = (nodeId, level, correct) => ({ nodeId, level, depth: 0, correct });
    assert.equal(gapDetail([a('x', 'medium', false), a('x', 'easy', false)], 'x'), 'easy');
    assert.equal(gapDetail([a('x', 'medium', true), a('x', 'hard', false)], 'x'), 'hard');
    assert.equal(gapDetail([a('x', 'medium', false), a('x', 'easy', true)], 'x'), 'mediumEasyOk');
    assert.equal(gapDetail([a('x', 'medium', false)], 'x'), 'medium');
  });
});
