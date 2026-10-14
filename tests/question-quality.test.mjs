import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { questionProblem, acceptQuestions, stemSimilarity } from '../src/lib/learn/question-bank.ts';
import { resolveTopic } from '../src/lib/learn/node-check.ts';

const base = { id: 'q', question: 'Hitung $2+3$.', options: ['4', '5', '6', '7'], correctIndex: 1, explanation: 'Hasilnya 5.' };
const GID = '45ba46f4-1d4c-4096-a369-cd60002d6f0e';

describe('question quality gate', () => {
  it('accepts a good question', () => assert.equal(questionProblem(base), null));
  it('rejects duplicate options after normalization', () => {
    assert.equal(questionProblem({ ...base, options: ['8x - 7', '8x-7', '$8x - 7$', '9'], correctIndex: 3, explanation: 'Hasilnya 9.' }), 'duplicate options');
    assert.equal(questionProblem({ ...base, options: ['A b', 'a  B', 'c'], correctIndex: 2, explanation: 'Jawabannya c.' }), 'duplicate options');
  });
  it('rejects bad option counts, empty options, bad index, empty explanation', () => {
    assert.equal(questionProblem({ ...base, options: ['4', '5'], correctIndex: 1 }), 'option count');
    assert.equal(questionProblem({ ...base, options: ['1', '2', '3', '4', '5', '6'] }), 'option count');
    assert.equal(questionProblem({ ...base, options: ['4', ' ', '6'] }), 'empty option');
    assert.equal(questionProblem({ ...base, correctIndex: 9 }), 'shape');
    assert.equal(questionProblem({ ...base, explanation: '  ' }), 'no explanation');
  });
  it('rejects an explanation that backs another option', () => {
    const q = { ...base, question: 'Bentuk sederhana dari bentuk ini?', options: ['$4x+9y$', '$4x+8y$', '$x$'], correctIndex: 0, explanation: 'Hasil akhirnya adalah $4x+8y$.' };
    assert.equal(questionProblem(q), 'explanation supports another option');
    assert.equal(questionProblem({ ...q, explanation: 'Hasil akhirnya $4x + 9y$, bukan $4x+8y$.' }), null);
  });
  it('flags 3x5 for 3x^5 only in a LaTeX set', () => {
    const q = { ...base, question: 'Turunkan bentuk berikut.', options: ['$3x^{5}$', '3x5', '$x$'], correctIndex: 0, explanation: 'Jawabannya $3x^{5}$.' };
    assert.equal(questionProblem(q), 'malformed exponent');
    assert.equal(questionProblem({ ...q, options: ['$3x^{5}$', '$3x^{4}$', '$x$'] }), null);
    assert.equal(questionProblem({ ...q, options: ['kalimat satu', 'kalimat dua', 'x2 saja'], explanation: 'Jawabannya kalimat satu.' }), null);
  });
  it('drops a key that contradicts plain arithmetic, keeps ambiguous stems', () => {
    assert.equal(questionProblem({ ...base, correctIndex: 0, explanation: 'Hasilnya 4.' }), 'key contradicts arithmetic');
    assert.equal(questionProblem({ ...base, question: 'Hitung $(2+3)\times 4$.', options: ['20', '14', '24'], correctIndex: 0, explanation: 'Hasilnya 20.' }), null);
    assert.equal(questionProblem({ ...base, question: 'Hitung $2^{3}$.', options: ['6', '8', '9'], correctIndex: 1, explanation: 'Hasilnya 8.' }), null);
    // word problem: digits outside the expression, so not checked
    assert.equal(questionProblem({ ...base, question: 'Ada 3 apel dan $2+3$ jeruk, berapa jeruk?', options: ['9', '5', '7'], correctIndex: 0, explanation: 'Hasilnya 9.' }), null);
    // symbolic key: not checked
    assert.equal(questionProblem({ ...base, options: ['$x$', '$y$', '$z$'], correctIndex: 0, explanation: 'Jawabannya $x$.' }), null);
  });
  it('drops near-duplicate stems in one set', () => {
    assert.ok(stemSimilarity('Sederhanakan -2(4-x)', 'Sederhanakan -2(x-4)') > 0.8);
    const a = { ...base, id: 'a', question: 'Sederhanakan $-2(4-x)$ sekarang.' };
    const b = { ...base, id: 'b', question: 'Sederhanakan $-2(x-4)$ sekarang.' };
    const c = { ...base, id: 'c', question: 'Faktorkan bentuk aljabar berikut ini.' };
    assert.deepEqual(acceptQuestions([a, b, c]).map(q => q.id), ['a', 'c']);
    assert.deepEqual(acceptQuestions([b], [a]).map(q => q.id), []);
  });
});

// Fake client: records the filters and answers with one row.
const fake = (row, seen = []) => ({
  from: () => { const b = { select: () => b, eq: (k, v) => (seen.push([k, v]), b), maybeSingle: async () => ({ data: row }) }; return b; },
});

describe('resolveTopic', () => {
  it('uses the stored topic of the owner graph', async () => {
    const seen = [];
    assert.equal(await resolveTopic(fake({ topic: 'Aljabar dasar' }, seen), 'u1', GID, 'dsa'), 'Aljabar dasar');
    assert.deepEqual(seen, [['id', GID], ['user_id', 'u1']]);
  });
  it('keeps the fallback for signed-out, local ids, missing rows and errors', async () => {
    assert.equal(await resolveTopic(fake({ topic: 'x' }), undefined, GID, 'dsa'), 'dsa');
    assert.equal(await resolveTopic(fake({ topic: 'x' }), 'u1', 'demo-graph', 'dsa'), 'dsa');
    assert.equal(await resolveTopic(fake({ topic: 'x' }), 'u1', undefined, 'rekursi'), 'rekursi');
    assert.equal(await resolveTopic(fake(null), 'u1', GID, 'dsa'), 'dsa');
    assert.equal(await resolveTopic({ from: () => { throw new Error('x'); } }, 'u1', GID, 'dsa'), 'dsa');
  });
});
