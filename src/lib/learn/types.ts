// ================================================================
// PIJAR - Learning Journey & Interactive Video Types (F4)
// ================================================================

import type { RecipeRef, StageSpec } from './scene-dsl';

export type VisualSceneType =
  | 'call-stack'
  | 'loss-landscape'
  | 'tree-structure'
  | 'code-execution'
  | 'data-flow'
  | 'concept-illustration'
  | 'math-visualization'
  | 'comparison';

export type MathTemplate = 'function-plot' | 'vector-add' | 'tangent' | 'area' | 'ratio' | 'exponential';

/** Declarative math visual. Data only: formulas are compiled by an allow-list (see math-spec.ts). */
export interface MathSpec {
  template: MathTemplate;
  viewBox?: { x: [number, number]; y: [number, number] };
  functions?: { expr: string; label?: string }[]; // max 3
  vectors?: { from?: [number, number]; to: [number, number]; label?: string }[]; // max 4
  points?: { at: [number, number]; label?: string }[]; // max 6
  tangentAt?: number;
  shadeArea?: [number, number];
  ratio?: { a: number; b: number };
}

/**
 * Old scene state, read only to convert materials cached before the scene DSL existed
 * (see scene-normalize.ts). New content never writes it.
 */
export interface LegacyVisualState {
  math?: MathSpec;
  stackItems?: Array<{ label: string; value: string; isBaseCase?: boolean }>;
  treeNodes?: Array<{ id: string; label: string; isHighlighted?: boolean; children?: string[] }>;
  activeNodes?: string[];
  flowStages?: Array<{ id: string; label: string; status: 'pending' | 'active' | 'done' }>;
  notes?: string;
}

export interface VideoCaption {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface VideoScene {
  id: string;
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  narration: string;
  /** Times are seconds from the start of this scene. */
  captions: VideoCaption[];
  /** Custom stage (objects + timeline), see scene-dsl.ts. */
  stage?: StageSpec;
  /** Or a named recipe with parameters, see scene-recipes.ts. */
  recipe?: RecipeRef;
  /** @deprecated Old shape, converted to a recipe on read. */
  visualType?: VisualSceneType;
  /** @deprecated Old shape, converted to a recipe on read. */
  visualState?: LegacyVisualState;
}

export interface VideoScriptPlan {
  conceptId: string;
  title: string;
  totalDurationSeconds: number;
  scenes: VideoScene[];
}

export interface DetailedLearningMaterial {
  nodeId: string;
  topic: string;
  title: string;
  learningObjective: string;
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  prerequisiteConcepts: string[];
  summary: string;
  conceptExplanation: string;
  analogy: string;
  keyDefinitions: Array<{ term: string; definition: string }>;
  examples: Array<{
    title: string;
    language: string;
    code: string;
    explanation: string;
    output?: string;
  }>;
  realWorldApplication: string;
  commonMisconceptions: Array<{
    misconception: string;
    correction: string;
  }>;
  keyTakeaways: string[];
  checkpointQuestions: CheckpointQuizQuestion[];
  videoScript: VideoScriptPlan;
  /** Optional interactive board for math topics (validated BoardSpec, see board-spec.ts). */
  interactiveBoard?: import('./board-spec').BoardSpec;
}

export interface CheckpointQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  distractorExplanations?: string[];
  conceptTested: string;
  misconceptionCategory?: string;
  hint?: string;
}

export interface QuizEvaluationResult {
  score: number;
  totalQuestions: number;
  isPassed: boolean;
  questionResults: Array<{
    questionId: string;
    userSelected: number;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string;
    userExplanation?: string;
    misconceptionFeedback?: string;
  }>;
  unlockedNodeIds?: string[];
  summaryFeedback: string;
}
