import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBoardSpec, boardFromRecipe, fallbackBoardSpec, pickBoardRecipe, sanitizeMaterialBoard, BOARD_RECIPES, BOARD_CAPS } from '../src/lib/learn/board-spec.ts';
import { compileExpr } from '../src/lib/learn/math-spec.ts';

const curve = (expr) => ({ expr });

describe('compileExpr with slider parameters', () => {
  it('only accepts listed parameter names and evaluates them', () => {
    assert.equal(compileExpr('a*x', []), null);
    const f = compileExpr('a*x+k', ['a', 'k']);
    assert.equal(f(2, { a: 3, k: 1 }), 7);
    assert.equal(compileExpr('a(x)', ['a']), null);
    assert.equal(compileExpr('constructor', ['a']), null);
  });
});

describe('board-spec: custom boards', () => {
  it('fills defaults and keeps a minimal board', () => {
    const b = sanitizeBoardSpec({ curves: [curve('x^2')] });
    assert.ok(b);
    assert.deepEqual(b.viewBox, { x: [-6, 6], y: [-4, 8] });
    assert.equal(b.curves[0].id, 'f');
    assert.deepEqual([b.sliders, b.gliders, b.points, b.readouts], [[], [], [], []]);
    assert.equal(b.instruction, '');
  });

  it('returns null when nothing is drawable or the input is not an object', () => {
    for (const bad of [null, undefined, 'x^2', 5, [], {}, { curves: [curve('process.exit()')] }, { recipe: 'no-such-recipe' }]) {
      assert.equal(sanitizeBoardSpec(bad), null, JSON.stringify(bad));
    }
  });

  it('enforces the caps', () => {
    const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));
    const b = sanitizeBoardSpec({
      curves: many(6, (i) => curve(`x+${i}`)),
      sliders: many(8, (i) => ({ name: 'abcdhkmn'[i], min: 0, max: 1, step: 0.1, initial: 0 })),
      gliders: many(5, () => ({ on: 'f', x: 0 })),
      points: many(10, (i) => ({ id: String.fromCharCode(65 + i), at: [i, i] })),
      texts: many(9, (i) => ({ at: [0, 0], text: `t${i}` })),
    });
    assert.equal(b.curves.length, BOARD_CAPS.curves);
    assert.deepEqual(b.curves.map((c) => c.id), ['f', 'g', 'h']);
    assert.equal(b.sliders.length, BOARD_CAPS.sliders);
    assert.equal(b.gliders.length, BOARD_CAPS.gliders);
    assert.equal(b.points.length, BOARD_CAPS.points);
    assert.equal(b.texts.length, BOARD_CAPS.texts);
  });

  it('rejects hostile expressions but allows slider parameters', () => {
    const b = sanitizeBoardSpec({
      sliders: [{ name: 'a', min: -2, max: 2, step: 0.5, initial: 1 }],
      curves: [curve('a*x^2'), curve('constructor.constructor("return 1")()'), curve('b*x'), curve('x; process.exit()'), curve('sin(x)')],
    });
    assert.deepEqual(b.curves.map((c) => c.expr), ['a*x^2', 'sin(x)']);
  });

  it('drops unknown fields and refuses unknown slider names', () => {
    const b = sanitizeBoardSpec({
      curves: [{ expr: 'x', onclick: 'alert(1)', __proto__: { evil: 1 } }],
      sliders: [{ name: 'x', min: 0, max: 1 }, { name: 'e', min: 0, max: 1 }, { name: 'a', min: 0, max: 1, script: '1' }],
      html: '<img onerror=1>',
    });
    assert.deepEqual(Object.keys(b).sort(), ['angles', 'curves', 'gliders', 'instruction', 'learningGoal', 'points', 'polygons', 'readouts', 'secants', 'sliders', 'tangents', 'texts', 'vectors', 'viewBox']);
    assert.deepEqual(b.sliders.map((s) => s.name), ['a']);
    assert.equal('onclick' in b.curves[0], false);
    assert.equal('script' in b.sliders[0], false);
  });

  it('normalizes sliders: range, step, initial', () => {
    const b = sanitizeBoardSpec({
      curves: [curve('a*x')],
      sliders: [{ name: 'a', min: 0, max: 10, step: 0, initial: 99 }, { name: 'a', min: 0, max: 1 }, { name: 'b', min: 5, max: 1 }, { name: 'c', min: 0, max: 1000, step: 0.0001, initial: -3 }],
    });
    assert.equal(b.sliders.length, 2);
    assert.equal(b.sliders[0].step, 0.1);
    assert.equal(b.sliders[0].initial, 10);
    assert.equal(b.sliders[1].step, 10);
    assert.equal(b.sliders[1].initial, 0);
  });

  it('strips markup from labels and texts and bounds their length', () => {
    const b = sanitizeBoardSpec({
      instruction: '<b>Geser</b> titik $P$ & lihat\\n',
      learningGoal: 'g'.repeat(500),
      curves: [{ expr: 'x', label: '<script>x</script>' }],
      texts: [{ at: [0, 0], text: '{$\\frac{1}{2}$}' }],
    });
    assert.ok(!/[<>&$\\{}]/.test(b.instruction + b.curves[0].label + (b.texts[0]?.text ?? '')));
    assert.equal(b.learningGoal.length, 140);
  });

  it('drops dependents of missing references and non-finite numbers', () => {
    const b = sanitizeBoardSpec({
      viewBox: { x: [5, -5], y: [NaN, 1] },
      curves: [curve('x')],
      gliders: [{ on: 'zzz', x: 1e9 }],
      tangents: [{ at: 'P' }, { at: 'Q' }],
      secants: [{ from: 'P', h: 'n' }, { from: 'P', h: 0 }, { from: 'P', h: 0.5 }],
      points: [{ id: 'A', at: [1, 1] }, { id: 'A', at: [2, 2] }, { id: 'ab', at: [0, 0] }, { id: 'B', at: [Infinity, 0] }],
      vectors: [{ from: 'A', to: 'Z' }, { from: 'A', to: [1, 2] }],
      polygons: [{ points: ['A', 'B'] }],
      readouts: [{ label: 'x', kind: 'param', ref: 'a' }, { label: 'y', kind: 'bogus' }, { label: 'ok', kind: 'x', ref: 'A' }],
    });
    assert.deepEqual(b.viewBox, { x: [-6, 6], y: [-4, 8] });
    assert.equal(b.gliders[0].on, 'f');
    assert.ok(b.gliders[0].x <= 6);
    assert.deepEqual(b.tangents, [{ at: 'P' }]);
    assert.deepEqual(b.secants, [{ from: 'P', h: 0.5 }]);
    assert.deepEqual(b.points.map((p) => [p.id, p.at]), [['A', [1, 1]], ['B', [0, 0]]]);
    assert.equal(b.vectors.length, 1);
    assert.equal(b.polygons.length, 0);
    assert.deepEqual(b.readouts.map((r) => r.label), ['ok']);
  });

  it('sanitizeMaterialBoard cleans or removes the board on a material', () => {
    const good = { interactiveBoard: { curves: [curve('x^2')], extra: 1 } };
    sanitizeMaterialBoard(good);
    assert.equal('extra' in good.interactiveBoard, false);
    const bad = { interactiveBoard: { curves: [curve('eval(x)')] } };
    sanitizeMaterialBoard(bad);
    assert.equal('interactiveBoard' in bad, false);
    const none = {};
    sanitizeMaterialBoard(none);
    assert.deepEqual(none, {});
  });
});

describe('board-spec: recipes', () => {
  it('every recipe validates, has texts, readouts and a drawable element', () => {
    for (const name of BOARD_RECIPES) {
      for (const lang of ['id', 'en']) {
        const b = boardFromRecipe(name, {}, lang);
        assert.ok(b, name);
        assert.equal(b.recipe, name);
        assert.ok(b.instruction.length > 10 && b.learningGoal.length > 10, `${name} texts`);
        assert.ok(b.readouts.length >= 2, `${name} readouts`);
        assert.ok(b.curves.length || b.points.length || b.unitCircle, name);
      }
    }
  });

  it('recipes keep their structure', () => {
    const d = boardFromRecipe('derivative-tangent', { expr: 'x^3', x0: 2 });
    assert.equal(d.curves[0].expr, 'x^3');
    assert.equal(d.gliders[0].x, 2);
    assert.equal(d.tangents.length, 1);
    assert.ok(d.readouts.some((r) => r.kind === 'slope'));
    const s = boardFromRecipe('secant-tangent');
    assert.deepEqual(s.secants, [{ from: 'P', h: 'h' }]);
    const r = boardFromRecipe('riemann-sum', { from: 1, to: 3 });
    assert.deepEqual([r.riemann.from, r.riemann.to, r.riemann.n], [1, 3, 'n']);
    const v = boardFromRecipe('vector-addition');
    assert.equal(v.points.filter((p) => p.draggable).length, 2);
    assert.deepEqual(v.points.find((p) => p.id === 'S').sumOf, ['A', 'B']);
    assert.equal(v.vectors.length, 4);
    const u = boardFromRecipe('unit-circle');
    assert.equal(u.unitCircle.angle, 't');
    const t = boardFromRecipe('function-transform', { expr: 'sin(x)' });
    assert.equal(t.curves[1].expr, 'a*(sin((x-b)))+k');
    assert.equal(t.curves[0].dashed, true);
    assert.equal(boardFromRecipe('quadratic-explorer').sliders.length, 3);
  });

  it('recipe params are validated and a recipe reference may override only the texts', () => {
    const b = sanitizeBoardSpec({ recipe: 'derivative-tangent', params: { expr: 'process.exit()', x0: 'abc' }, instruction: 'Teks sendiri', curves: [curve('hacked')] });
    assert.equal(b.curves[0].expr, 'x^2');
    assert.equal(b.instruction, 'Teks sendiri');
    assert.equal(b.curves.length, 1);
  });
});

describe('board-spec: keyword fallback', () => {
  it('picks a recipe by topic words', () => {
    const cases = [
      ['Turunan fungsi trigonometri', 'derivative-tangent'],
      ['Limit fungsi', 'secant-tangent'],
      ['Integral tentu', 'riemann-sum'],
      ['Vektor di bidang', 'vector-addition'],
      ['Sinus dan kosinus', 'unit-circle'],
      ['Transformasi fungsi', 'function-transform'],
      ['Fungsi kuadrat', 'quadratic-explorer'],
      ['Matematika: fungsi dan aljabar', 'function-transform'],
    ];
    for (const [text, recipe] of cases) assert.equal(pickBoardRecipe(text), recipe, text);
  });
  it('returns nothing for non-math topics', () => {
    for (const text of ['Fungsi dalam Python', 'Rekursi', 'SQL joins', '']) {
      assert.equal(pickBoardRecipe(text), null, text);
      assert.equal(fallbackBoardSpec(text), null);
    }
    assert.ok(fallbackBoardSpec('Turunan', 'en').instruction.startsWith('Drag'));
  });
});
