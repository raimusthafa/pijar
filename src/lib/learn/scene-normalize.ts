// ================================================================
// PIJAR - Turn any stored/AI video script into playable scenes.
// New shape: scene.stage (custom DSL) or scene.recipe (named recipe).
// Old shape (visualType + visualState) is converted to a recipe so
// materials cached before the DSL existed still play with a real stage.
// ================================================================

import type { VideoScriptPlan } from './types.ts';
import {
  DEFAULT_SCENE_SECONDS, LIMITS, captionsFromNarration, cleanText, clamp, isObj, num,
  sceneTimeCaptions, validateStage, type PlayableScene, type StageSpec,
} from './scene-dsl.ts';
import { buildRecipe, type RecipeCtx } from './scene-recipes.ts';

type Rec = Record<string, unknown>;
type Lang = 'id' | 'en';

const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);

/** Old visualType/visualState -> a recipe reference. Never returns null. */
function legacyRecipe(scene: Rec): { name: string; params: Rec } {
  const type = typeof scene.visualType === 'string' ? scene.visualType : '';
  const state = isObj(scene.visualState) ? scene.visualState : {};
  const math = isObj(state.math) ? state.math : null;

  if (math && typeof math.template === 'string') {
    const fn = list(math.functions, 1)[0];
    const expr = isObj(fn) && typeof fn.expr === 'string' ? fn.expr : undefined;
    const vb = isObj(math.viewBox) ? math.viewBox : {};
    const base: Rec = { ...(expr ? { expr } : {}), ...(vb.x ? { xRange: vb.x } : {}), ...(vb.y ? { yRange: vb.y } : {}) };
    switch (math.template) {
      case 'vector-add': {
        const vs = list(math.vectors, 2).filter(isObj);
        return { name: 'vector-add', params: { a: vs[0]?.to, b: vs[1]?.to } };
      }
      case 'tangent':
        return { name: 'derivative-tangent', params: base };
      case 'area': {
        const sa = Array.isArray(math.shadeArea) ? math.shadeArea : [];
        return { name: 'area-riemann', params: { ...base, a: sa[0], b: sa[1] } };
      }
      case 'ratio': {
        const r = isObj(math.ratio) ? math.ratio : {};
        return { name: 'ratio', params: { a: r.a, b: r.b } };
      }
      default:
        return { name: 'function-plot', params: base };
    }
  }

  const stack = list(state.stackItems, 6).filter(isObj);
  if (type === 'call-stack' && stack.length >= 2) {
    return { name: 'call-stack', params: { frames: [...stack].reverse().map((s) => ({ label: s.label, sub: s.value })) } };
  }
  if (type === 'loss-landscape') return { name: 'gradient-descent', params: {} };
  const nodes = list(state.treeNodes, 7).filter(isObj);
  if (type === 'tree-structure') return { name: 'tree-traversal', params: { nodes: nodes.map((n) => n.label) } };
  const flow = list(state.flowStages, 5).filter(isObj);
  if (type === 'data-flow' && flow.length >= 2) return { name: 'pipeline', params: { stages: flow.map((f) => f.label) } };
  if (type === 'data-flow') return { name: 'pipeline', params: {} };
  if (type === 'code-execution') {
    const notes = cleanText(state.notes, 40);
    return { name: 'code-walk', params: notes ? { steps: [notes] } : {} };
  }
  const active = list(state.activeNodes, 5);
  return { name: 'concept-map', params: { points: active } };
}

function stageFor(scene: Rec, dur: number, title: string, language: Lang): StageSpec {
  const ctx: RecipeCtx = { d: dur, title, language };
  // 1. custom stage
  if (isObj(scene.stage)) {
    const v = validateStage(scene.stage, dur);
    if (v) return v;
  }
  // 2. named recipe
  if (isObj(scene.recipe)) {
    const frag = buildRecipe(scene.recipe.name, scene.recipe.params, ctx);
    const v = frag && validateStage(frag, dur);
    if (v) return v;
  }
  // 3. old shape
  const legacy = legacyRecipe(scene);
  const frag = buildRecipe(legacy.name, legacy.params, ctx);
  const v = frag && validateStage(frag, dur);
  if (v) return v;
  // 4. last resort, always valid
  return validateStage(buildRecipe('concept-map', {}, ctx)!, dur)!;
}

/**
 * A scene title the model left out or wrote as a bare number ("1"): borrow a short phrase from the
 * first caption or the narration, so the chip and the stage heading say something.
 */
export function sceneTitle(scene: Rec, index: number): string {
  const given = cleanText(scene.title, 70);
  if (given && given.length >= 3 && !/^\d+[.)]?$/.test(given)) return given;
  const caps = Array.isArray(scene.captions) ? scene.captions : [];
  const firstCaption = isObj(caps[0]) ? cleanText(caps[0].text, 160) : null;
  const sources = [cleanText(scene.narration, 300), firstCaption?.replace(/\$[^$]*\$/g, '').trim()];
  for (const raw of sources) {
    if (!raw) continue;
    const sentence = raw.split(/(?<=[.!?])\s/)[0].replace(/[.!?:;,]+$/, '').trim();
    if (sentence.length < 3) continue;
    if (sentence.length <= 44) return sentence;
    const words = sentence.split(/\s+/).slice(0, 6).join(' ');
    return words.slice(0, 44).replace(/[,;:]+$/, '');
  }
  return `${index + 1}`;
}

export function normalizeScene(raw: unknown, index: number, sceneStart: number, language: Lang): PlayableScene {
  const scene: Rec = isObj(raw) ? raw : {};
  const id = typeof scene.id === 'string' && /^[\w-]{1,32}$/.test(scene.id) ? scene.id : `sc${index + 1}`;
  const title = sceneTitle(scene, index);
  const narration = cleanText(scene.narration, 700) ?? '';
  const dur = clamp(num(scene.durationSeconds) ?? DEFAULT_SCENE_SECONDS, LIMITS.sceneMin, LIMITS.sceneMax);
  const stage = stageFor(scene, dur, title, language);
  let captions = sceneTimeCaptions(scene.captions, dur, sceneStart);
  if (!captions.length && narration) captions = captionsFromNarration(narration, dur);
  return { id, sceneNumber: index + 1, title, durationSeconds: dur, narration, captions, stage };
}

export interface PlayableScript {
  title: string;
  scenes: PlayableScene[];
  totalSeconds: number;
}

/** Normalize a whole script. Caps at 8 scenes; guarantees at least one scene. */
export function normalizeVideoScript(script: VideoScriptPlan | unknown, language: Lang = 'id'): PlayableScript {
  const s: Rec = isObj(script) ? script : {};
  const rawScenes = list(s.scenes, 8);
  const scenes: PlayableScene[] = [];
  let start = 0;
  rawScenes.forEach((r, i) => {
    const sc = normalizeScene(r, i, start, language);
    // Ids must be unique inside a script.
    if (scenes.some((x) => x.id === sc.id)) sc.id = `${sc.id}-${i + 1}`;
    start += isObj(r) ? clamp(num(r.durationSeconds) ?? DEFAULT_SCENE_SECONDS, LIMITS.sceneMin, LIMITS.sceneMax) : DEFAULT_SCENE_SECONDS;
    scenes.push(sc);
  });
  if (!scenes.length) scenes.push(normalizeScene({}, 0, 0, language));
  const title = cleanText(s.title, 90) ?? scenes[0].title;
  return { title, scenes, totalSeconds: scenes.reduce((a, x) => a + x.durationSeconds, 0) };
}

/** Rewrite a material's videoScript in place into the clean new shape (server side, before caching). */
export function sanitizeVideoScript(material: unknown, language: Lang = 'id'): void {
  if (!isObj(material) || !isObj(material.videoScript)) return;
  const script = material.videoScript;
  const norm = normalizeVideoScript(script, language);
  const rawScenes = list(script.scenes, 8);
  script.scenes = norm.scenes.map((sc, i) => {
    const raw = isObj(rawScenes[i]) ? rawScenes[i] : {};
    // Old shapes stay as stored: they are converted when played, in the viewer's language.
    if (!isObj(raw.stage) && !isObj(raw.recipe)) return rawScenes[i];
    // A recipe reference stays a reference (small, and it improves when the recipe does).
    const keepRecipe = !isObj(raw.stage) && isObj(raw.recipe) && buildRecipe(raw.recipe.name, raw.recipe.params, { d: sc.durationSeconds, title: sc.title, language }) !== null;
    return {
      id: sc.id,
      sceneNumber: sc.sceneNumber,
      title: sc.title,
      durationSeconds: sc.durationSeconds,
      narration: sc.narration,
      captions: sc.captions,
      ...(keepRecipe ? { recipe: { name: (raw.recipe as Rec).name, params: (raw.recipe as Rec).params ?? {} } } : { stage: sc.stage }),
    };
  });
  script.totalDurationSeconds = norm.totalSeconds;
}
