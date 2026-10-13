// ================================================================
// PIJAR - Learning Journey & Interactive Video Types (F4)
// ================================================================

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

export interface VisualSceneState {
  math?: MathSpec;
  currentStep?: number;
  totalSteps?: number;
  highlightedLine?: number;
  variables?: Record<string, string | number | boolean>;
  stackItems?: Array<{ label: string; value: string; isBaseCase?: boolean }>;
  lossPoint?: { x: number; y: number; loss: number; step: number };
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
  visualType: VisualSceneType;
  visualState: VisualSceneState;
  captions: VideoCaption[];
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
