import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compileExpr, validateMathSpec, sanitizeScenesMath, describeMathSpec, DEFAULT_MATH_SPECS } from '../src/lib/learn/math-spec.ts';

describe('math-spec: compileExpr allow-list', () => {
  it('accepts normal formulas and evaluates them', () => {
    const f = compileExpr('sin(x)*x^2');
    assert.ok(f);
    assert.ok(Math.abs(f(2) - Math.sin(2) * 4) < 1e-12);
    assert.equal(compileExpr('2^x')(3), 8);
    assert.ok(Math.abs(compileExpr('ln(e)')(0) - 1) < 1e-12);
    assert.ok(Math.abs(compileExpr('log(100)')(0) - 2) < 1e-12);
    assert.ok(Math.abs(compileExpr('pi*x')(1) - Math.PI) < 1e-12);
    assert.ok(compileExpr('2x + 1'));
  });

  it('rejects anything outside the allow-list', () => {
    for (const bad of [
      'constructor', 'process.exit()', 'x; 1', 'import("fs")', 'x = 5', '"abc"', 'a+1', 'x.y', 'sin', 'x(2)',
      'cos(x)[0]', 'eval(x)', 'x'.repeat(81), '', '   ', 'sin(x', '{}', 'f(x)', 'sin (x)'.replace('sin', 'toString'),
    ]) {
      assert.equal(compileExpr(bad), null, `harus ditolak: ${JSON.stringify(bad).slice(0, 40)}`);
    }
    assert.equal(compileExpr(42), null);
    assert.equal(compileExpr(undefined), null);
  });

  it('turns non-finite results into NaN', () => {
    assert.ok(Number.isNaN(compileExpr('1/0')(0)));
    assert.ok(Number.isNaN(compileExpr('1/x')(0)));
    assert.ok(Number.isNaN(compileExpr('sqrt(x)')(-1)));
    assert.ok(Number.isNaN(compileExpr('ln(x)')(-1)));
  });
});

describe('math-spec: validateMathSpec', () => {
  it('rejects non-objects and unknown templates', () => {
    for (const v of [null, undefined, 'x', 5, [], {}, { template: 'eval' }]) assert.equal(validateMathSpec(v), null);
  });

  it('clamps counts, viewBox and drops unknown fields and bad formulas', () => {
    const s = validateMathSpec({
      template: 'function-plot',
      evil: 'rm -rf',
      viewBox: { x: [-500, 500], y: [3, 2] }, // y invalid (min>=max) -> default
      functions: [{ expr: 'x' }, { expr: 'x^2' }, { expr: 'process.exit()' }, { expr: 'sin(x)' }, { expr: 'cos(x)' }],
      vectors: Array.from({ length: 9 }, (_, i) => ({ to: [i, i] })),
      points: Array.from({ length: 9 }, (_, i) => ({ at: [i, i], label: 'p'.repeat(100) })),
    });
    assert.ok(s);
    assert.equal(s.evil, undefined);
    assert.deepEqual(s.viewBox, DEFAULT_MATH_SPECS['function-plot'].viewBox);
    assert.equal(s.functions.length, 3);
    assert.deepEqual(s.functions.map((f) => f.expr), ['x', 'x^2', 'sin(x)']);
    assert.equal(s.vectors.length, 4);
    assert.equal(s.points.length, 6);
    assert.equal(s.points[0].label.length, 40);

    const clamped = validateMathSpec({ template: 'tangent', viewBox: { x: [-500, 500], y: [-1, 1] }, tangentAt: 1e9 });
    assert.deepEqual(clamped.viewBox.x, [-100, 100]);
    assert.equal(clamped.tangentAt, 100);
    assert.ok(clamped.functions.length >= 1);
  });

  it('rejects non-finite numbers and fills template needs', () => {
    const v = validateMathSpec({ template: 'vector-add', vectors: [{ to: [NaN, 1] }, { to: ['a', 2] }] });
    assert.deepEqual(v.vectors, DEFAULT_MATH_SPECS['vector-add'].vectors);
    const r = validateMathSpec({ template: 'ratio', ratio: { a: -1, b: 3 } });
    assert.deepEqual(r.ratio, { a: 2, b: 3 });
    assert.ok(describeMathSpec(r).includes(':'));
  });
});

describe('math-spec: AI-shaped material', () => {
  const material = () => ({
    nodeId: 'n',
    videoScript: {
      scenes: [
        { id: 's1', visualType: 'math-visualization', visualState: { math: { template: 'function-plot', functions: [{ expr: 'constructor.constructor("return process")()' }] } } },
        { id: 's2', visualType: 'math-visualization', visualState: { math: 'not an object' } },
        { id: 's3', visualType: 'math-visualization', visualState: { math: { template: 'area', functions: [{ expr: 'x^2' }], shadeArea: [0, 2] } } },
        { id: 's4', visualType: 'concept-illustration', visualState: { notes: 'x' } },
      ],
    },
  });

  it('hostile expression is dropped (compileExpr -> null), material survives', () => {
    const m = material();
    assert.equal(compileExpr(m.videoScript.scenes[0].visualState.math.functions[0].expr), null);
    sanitizeScenesMath(m);
    const [s1, s2, s3, s4] = m.videoScript.scenes;
    // hostile formula removed, template defaults used instead of the attacker's text
    assert.deepEqual(s1.visualState.math.functions, DEFAULT_MATH_SPECS['function-plot'].functions);
    assert.equal('math' in s2.visualState, false);
    assert.deepEqual(s3.visualState.math.shadeArea, [0, 2]);
    assert.equal(s4.visualState.math, undefined);
    assert.equal(m.videoScript.scenes.length, 4);
  });

  it('does not throw on malformed materials', () => {
    for (const v of [null, {}, { videoScript: null }, { videoScript: { scenes: [null, 1, { visualState: null }] } }]) {
      assert.doesNotThrow(() => sanitizeScenesMath(v));
    }
  });
});
