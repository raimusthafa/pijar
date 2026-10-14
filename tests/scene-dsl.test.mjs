import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateStage, cleanLatex, runtimeSeconds, LIMITS } from '../src/lib/learn/scene-dsl.ts';
import { RECIPE_NAMES, buildRecipe } from '../src/lib/learn/scene-recipes.ts';
import { normalizeScene, normalizeVideoScript, sanitizeVideoScript } from '../src/lib/learn/scene-normalize.ts';
import { buildFallbackVideo } from '../src/lib/learn/scene-fallback.ts';
import { CURATED_MATERIALS } from '../src/lib/learn/curated-materials.ts';

const base = {
  objects: [
    { id: 't', type: 'text', text: 'Halo', at: [0, 0] },
    { id: 'ax', type: 'axes', at: [0, 0], size: [6, 4], xRange: [-3, 3, 1], yRange: [-1, 9, 2] },
    { id: 'g', type: 'function-graph', axes: 'ax', expr: 'x^2', color: 'amber' },
  ],
  timeline: [{ do: 'write', target: 't', at: 0, dur: 1 }, { do: 'draw-graph', target: 'g', at: 1, dur: 2 }],
};

describe('scene DSL validation', () => {
  it('accepts a valid stage', () => {
    const s = validateStage(base, 12);
    assert.equal(s.objects.length, 3);
    assert.equal(s.timeline.length, 2);
  });

  it('drops unknown actions, unknown targets, bad colors and duplicate ids', () => {
    const s = validateStage({
      objects: [
        ...base.objects,
        { id: 't', type: 'text', text: 'dup', at: [1, 1] },
        { id: 'c', type: 'circle', at: [0, 0], radius: 1, color: 'neon-pink' },
        { id: 'h', type: 'html', raw: '<script>' },
      ],
      timeline: [
        { do: 'explode', target: 't', at: 0, dur: 1 },
        { do: 'write', target: 'nope', at: 0, dur: 1 },
        { do: 'fade-in', target: 'c', at: 2, dur: 1 },
      ],
    }, 12);
    assert.equal(s.objects.length, 4); // dup and html dropped
    assert.equal(s.objects.find((o) => o.id === 'c').color, undefined); // falls back to the default color
    assert.equal(s.timeline.length, 1);
  });

  it('rejects hostile expressions and LaTeX, strips control characters', () => {
    const s = validateStage({
      objects: [
        base.objects[1],
        { id: 'g1', type: 'function-graph', axes: 'ax', expr: 'constructor.constructor("return process")()' },
        { id: 'g2', type: 'function-graph', axes: 'ax', expr: 'x; process.exit()' },
        { id: 'm1', type: 'mathtex', latex: '\\href{javascript:alert(1)}{x}', at: [0, 0] },
        { id: 'm2', type: 'mathtex', latex: '\\input{/etc/passwd}', at: [0, 0] },
        { id: 'm3', type: 'mathtex', latex: 'x^{2', at: [0, 0] },
        { id: 'm4', type: 'mathtex', latex: '\\frac{a}{b}', at: [0, 0] },
        { id: 'x1', type: 'text', text: 'a\u0000b', at: [0, 0] },
      ],
      timeline: [],
    }, 12);
    assert.deepEqual(s.objects.map((o) => o.id), ['ax', 'm4', 'x1']);
    assert.equal(s.objects[2].text, 'ab');
    assert.equal(cleanLatex('\\def\\x{1}'), null);
  });

  it('caps objects, timeline entries and durations, clamps positions', () => {
    const objects = Array.from({ length: 80 }, (_, i) => ({ id: `d${i}`, type: 'dot', at: [999, -999] }));
    const timeline = Array.from({ length: 200 }, () => ({ do: 'fade-in', target: 'd0', at: 1, dur: 999 }));
    const s = validateStage({ objects, timeline }, 10);
    assert.equal(s.objects.length, LIMITS.objects);
    assert.equal(s.timeline.length, LIMITS.timeline);
    assert.ok(s.timeline.every((e) => e.dur <= LIMITS.entryDur && e.at + e.dur <= 10));
    assert.ok(s.objects.every((o) => Math.abs(o.at[0]) <= 7 && Math.abs(o.at[1]) <= 4));
  });

  it('returns null when nothing drawable is left', () => {
    assert.equal(validateStage({ objects: [{ id: 'x', type: 'unknown' }], timeline: [] }, 10), null);
    assert.equal(validateStage('nope', 10), null);
  });
});

describe('recipes', () => {
  it('every recipe builds a valid stage with a real timeline', () => {
    for (const name of RECIPE_NAMES) {
      const frag = buildRecipe(name, {}, { d: 14, title: 'Judul', language: 'id' });
      const s = validateStage(frag, 14);
      assert.ok(s, name);
      assert.ok(s.objects.length >= 4, `${name} objects`);
      assert.ok(s.timeline.length >= 4, `${name} timeline`);
      assert.equal(new Set(s.objects.map((o) => o.id)).size, s.objects.length, `${name} ids unique`);
    }
  });

  it('survives hostile parameters', () => {
    const frag = buildRecipe('derivative-tangent', { expr: 'process.exit()', label: '\\input{x}', from: 'NaN', xRange: [5, -5] }, { d: 12, title: 'x', language: 'en' });
    const s = validateStage(frag, 12);
    assert.ok(s);
    assert.equal(s.objects.find((o) => o.type === 'function-graph').expr, 'x^2');
    assert.equal(buildRecipe('rm -rf', {}, { d: 12, title: 'x', language: 'en' }), null);
  });
});

describe('normalization and backward compatibility', () => {
  it('old scene shapes become recipe-based stages', () => {
    const old = [
      { id: 'a', visualType: 'call-stack', visualState: { stackItems: [{ label: 'f(1)', value: 'base' }, { label: 'f(2)', value: 'wait' }, { label: 'f(3)', value: 'wait' }] } },
      { id: 'b', visualType: 'math-visualization', visualState: { math: { template: 'tangent', functions: [{ expr: 'x^3' }], tangentAt: 1 } } },
      { id: 'c', visualType: 'loss-landscape', visualState: { lossPoint: { x: 1, y: 1, loss: 1, step: 0 } } },
      { id: 'd', visualType: 'tree-structure', visualState: { treeNodes: [{ id: 'r', label: 'Root' }] } },
      { id: 'e', visualType: 'data-flow', visualState: { flowStages: [{ id: 'x', label: 'A', status: 'done' }, { id: 'y', label: 'B', status: 'active' }] } },
      { id: 'f', visualType: 'concept-illustration', visualState: { notes: 'hi' } },
      { id: 'g', visualType: 'something-new', visualState: null },
      null,
      7,
    ];
    for (const [i, raw] of old.entries()) {
      const sc = normalizeScene(raw, i, 0, 'id');
      assert.ok(sc.stage.objects.length >= 4, `scene ${i} has a stage`);
      assert.ok(sc.stage.timeline.length >= 4, `scene ${i} animates`);
    }
    const graph = normalizeScene(old[1], 1, 0, 'id').stage.objects.find((o) => o.type === 'function-graph');
    assert.equal(graph.expr, 'x^3');
  });

  it('absolute caption times from old materials are converted to scene time', () => {
    const sc = normalizeScene({ id: 's2', durationSeconds: 16, narration: 'x', captions: [{ startSeconds: 12, endSeconds: 20, text: 'a' }, { startSeconds: 20, endSeconds: 28, text: 'b' }] }, 1, 12, 'id');
    assert.deepEqual(sc.captions.map((c) => [c.startSeconds, c.endSeconds]), [[0, 8], [8, 16]]);
  });

  it('a script with garbage still plays', () => {
    for (const bad of [null, {}, { scenes: 'x' }, { scenes: [] }]) {
      assert.ok(normalizeVideoScript(bad).scenes.length >= 1);
    }
    assert.ok(normalizeVideoScript({ scenes: Array.from({ length: 30 }, () => ({})) }).scenes.length <= 8);
  });

  it('curated materials and the fallback produce rich scenes in both languages', () => {
    const scripts = Object.values(CURATED_MATERIALS).map((m) => m.videoScript);
    for (const language of ['id', 'en']) {
      for (const visual of ['call-stack', 'loss-landscape', 'tree-structure', 'data-flow', 'code-execution', 'concept-illustration', 'math-visualization']) {
        scripts.push(buildFallbackVideo({ nodeId: 'n', label: 'Topik', topic: 'dsa', category: 'Kategori', desc: 'd', mathy: visual === 'math-visualization', visual, language }));
      }
    }
    for (const script of scripts) {
      const play = normalizeVideoScript(script);
      assert.ok(play.scenes.length >= 3);
      for (const sc of play.scenes) {
        assert.ok(sc.stage.objects.filter((o) => o.type !== 'text').length >= 2, `${sc.id} has shapes`);
        assert.ok(sc.stage.timeline.length >= 4);
      }
    }
  });

  it('sanitizeVideoScript keeps recipes as references and leaves old shapes alone', () => {
    const m = { videoScript: { scenes: [
      { id: 'a', durationSeconds: 12, narration: 'n', recipe: { name: 'pipeline', params: {} }, captions: [] },
      { id: 'b', durationSeconds: 12, narration: 'n', visualType: 'call-stack', visualState: {}, captions: [] },
      { id: 'c', durationSeconds: 12, narration: 'n', stage: { objects: [{ id: 'q', type: 'circle', at: [0, 0], radius: 1 }], timeline: [] }, captions: [] },
    ] } };
    sanitizeVideoScript(m);
    assert.equal(m.videoScript.scenes[0].recipe.name, 'pipeline');
    assert.equal(m.videoScript.scenes[1].visualType, 'call-stack');
    assert.equal(m.videoScript.scenes[2].stage.objects.length, 1);
  });

  it('scene runtime stretches to the narration', () => {
    const long = Array.from({ length: 100 }, () => 'kata').join(' ');
    assert.ok(runtimeSeconds({ durationSeconds: 10, narration: long }, 'id') > 30);
    assert.equal(runtimeSeconds({ durationSeconds: 14, narration: 'singkat' }, 'id'), 14);
  });
});

describe('review fixes', () => {
  it('a numeric or missing scene title is replaced by words from the narration', () => {
    const s = normalizeScene({ title: '1', narration: 'Mari kita amati kurva sinus. Perhatikan garis singgungnya.', recipe: { name: 'function-plot', params: {} } }, 0, 0, 'id');
    assert.equal(s.title, 'Mari kita amati kurva sinus');
    assert.equal(normalizeScene({ title: 'Garis singgung', narration: 'x y z' }, 1, 0, 'id').title, 'Garis singgung');
  });

  it('function-plot frames sin(x) instead of using the x^2 window', () => {
    const frag = buildRecipe('function-plot', { expr: 'sin(x)' }, { d: 12, title: 'x', language: 'id' });
    const ax = validateStage(frag, 12).objects.find((o) => o.type === 'axes');
    assert.ok(ax.yRange[1] <= 2 && ax.yRange[0] >= -2, `y range ${ax.yRange}`);
  });

  it('derivative-tangent draws the slope on a second pair of axes', () => {
    const frag = buildRecipe('derivative-tangent', { expr: 'sin(x)' }, { d: 14, title: 'x', language: 'id' });
    const s = validateStage(frag, 14);
    assert.equal(s.objects.filter((o) => o.type === 'axes').length, 2);
    assert.ok(s.objects.some((o) => o.type === 'function-graph' && o.derivative));
  });

  it('code lines keep their indentation', () => {
    const s = validateStage({ objects: [{ id: 'c', type: 'text', text: '  return 1;', at: [0, 0], mono: true }], timeline: [] }, 10);
    assert.equal(s.objects[0].text, '  return 1;');
  });
});

it('separateTexts pushes a formula that lands on the one above it', () => {
  const st = validateStage({
    objects: [
      { id: 'a', type: 'mathtex', latex: '\\frac{d}{dx}\\sin(x)=\\cos(x)', at: [0, 0.4], size: 'lg' },
      { id: 'b', type: 'mathtex', latex: '\\frac{d}{dx}\\cos(x)=-\\sin(x)', at: [0, -0.2], size: 'lg' },
    ],
    timeline: [{ do: 'write', target: 'a', at: 0, dur: 1 }, { do: 'write', target: 'b', at: 1, dur: 1 }],
  }, 12);
  const [a, b] = st.objects;
  assert.ok(a.at[1] - b.at[1] >= 1.4, `gap ${a.at[1] - b.at[1]}`);
});

describe('BL1 recipe composition and typography improvements', () => {
  it('all recipes set title size lg and color off-white', () => {
    for (const name of RECIPE_NAMES) {
      const frag = buildRecipe(name, {}, { d: 14, title: 'Title', language: 'id' });
      const ttl = frag.objects.find((o) => o.id === 'ttl');
      assert.ok(ttl, `${name} has ttl`);
      assert.equal(ttl.size, 'lg');
      assert.equal(ttl.color, 'off-white');
    }
  });

  it('vector-add uses dashed guide vector and side column breakdown', () => {
    const frag = buildRecipe('vector-add', {}, { d: 14, title: 'Vector Addition', language: 'id' });
    const vb0 = frag.objects.find((o) => o.id === 'vb0');
    assert.ok(vb0 && vb0.type === 'line' && vb0.dashed);
    const ls = frag.objects.find((o) => o.id === 'ls');
    assert.equal(ls.latex, '\\vec{s}');
    const pa = frag.objects.find((o) => o.id === 'pa');
    assert.ok(pa && pa.type === 'mathtex');
  });

  it('pipeline centers boxes vertically and includes flow summary text', () => {
    const frag = buildRecipe('pipeline', {}, { d: 14, title: 'Pipeline', language: 'id' });
    const s0 = frag.objects.find((o) => o.id === 's0');
    assert.equal(s0.at[1], 0.2);
    const flow = frag.objects.find((o) => o.id === 'flow');
    assert.ok(flow && flow.type === 'text');
    assert.equal(flow.at[1], -1.9);
  });

  it('derivative-tangent has prominent touch point', () => {
    const frag = buildRecipe('derivative-tangent', {}, { d: 14, title: 'Tangent', language: 'id' });
    const pp = frag.objects.find((o) => o.id === 'pp');
    assert.ok(pp && pp.radius >= 0.18 && pp.color === 'amber');
  });
});

