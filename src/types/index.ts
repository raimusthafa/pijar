// ================================================================
// PIJAR - Global TypeScript Types
// ================================================================

// ── AUTH & USER ────────────────────────────────────────────────
export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  learning_style: 'text' | 'video';
  target_goal: string | null;
  created_at: string;
  updated_at: string;
}

// ── ONBOARDING & COGNITIVE INTAKE ─────────────────────────────
export type LearnerLevel = 'absolute_beginner' | 'intermediate' | 'advanced_practitioner';
export type TargetAmbition = 'foundational_clarity' | 'career_ready' | 'master_practitioner';

export interface CognitiveIntakeResult {
  raw_input: string;
  canonical_topic: string;           // Nama topik yang dinormalisasi bersih
  domain_category: string;           // Kategori bidang ilmu
  detected_level: LearnerLevel;      // Tingkat kemampuan terdeteksi
  target_ambition: TargetAmbition;    // Ambisi target belajar
  pain_points: string[];             // Keluh kesah & kendala terdeteksi
  empathy_mentor_note: string;       // Catatan empati dari AI mentor
  recommended_diagnostic_focus: string[]; // Area fokus asesmen
  target_goal: string;               // Rekomendasi sasaran belajar
  is_practitioner_track: boolean;    // Apakah diarahkan ke jalur praktisi mahir
  recommended_first_step?: string;   // Rekomendasi langkah awal konkret
}

export interface OnboardingData {
  topic: string;
  target_goal: string;
  learning_style: 'text' | 'video';
  intake_context?: CognitiveIntakeResult;
}

// ── DIAGNOSTIC / PRE-TEST ─────────────────────────────────────
export type QuestionDifficulty = 'foundational' | 'intermediate' | 'advanced';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[];       // 4 opsi jawaban (A-D)
  concept_tested: string;  // Konsep yang diuji
  correct_index?: number;  // Indeks opsi yang benar (0-3)
  explanation?: string;    // Penjelasan rasional pedagogis
  target_node_id?: string; // Canonical node ID pada Knowledge Graph
  difficulty_tier?: QuestionDifficulty;
  scenario_context?: string; // Konteks kasus atau skenario nyata
}

export interface DiagnosticAnswer {
  question_id: string;
  question?: string;
  options?: string[];
  selected_option: number; // index 0-3
  correct_index?: number;  // index 0-3
  is_correct?: boolean;
  concept_tested: string;
  target_node_id?: string;
  confidence_level?: ConfidenceLevel;
}

export interface ConfidenceMatrix {
  misconceptions: number;  // Salah & Yakin tinggi
  regular_gaps: number;    // Salah & Ragu/sedang
  fragile: number;         // Benar & Ragu
  solid: number;           // Benar & Yakin
}

export interface KnowledgeGap {
  concept: string;
  target_node_id?: string; // Canonical node ID
  severity: 'critical' | 'moderate' | 'minor';
  justification: string;   // Penjelasan mengapa konsep ini penting
  prerequisites: string[]; // Konsep-konsep yang harus dikuasai lebih dulu
}

export interface DiagnosticResult {
  topic: string;
  total_questions: number;
  correct_count: number;
  identified_gaps: KnowledgeGap[];
  summary_narrative: string; // Narasi hasil diagnosa untuk ditampilkan ke user
  confidence_matrix?: ConfidenceMatrix;
  graph_id?: string;
  nodes?: CurriculumNode[];
  edges?: CurriculumEdge[];
  mode?: 'quick' | 'comprehensive';
  intake_context?: CognitiveIntakeResult;
}

// ── KNOWLEDGE GRAPH ───────────────────────────────────────────
export type NodeStatus = 'locked' | 'prerequisite_gap' | 'ready' | 'in_progress' | 'completed';

export interface CurriculumNode {
  id: string;
  label: string;
  category: string;
  description: string;
  status: NodeStatus;
  estimated_minutes: number;
  is_gap: boolean;         // Apakah ini node gap yang ditemukan dari diagnosa
  level?: number;          // Kolom pada peta (jalur terpanjang dari akar), diisi normalizeGraph
}

export interface CurriculumEdge {
  id: string;
  source: string;          // Node ID asal
  target: string;          // Node ID tujuan
  label?: string;
}

export interface LearningGraph {
  id: string;
  user_id: string;
  topic: string;
  nodes_json: CurriculumNode[];
  edges_json: CurriculumEdge[];
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

// ── LEARNING MATERIAL ─────────────────────────────────────────
export interface LearningMaterial {
  node_id: string;
  title: string;
  summary: string;
  key_concepts: string[];
  text_content: string;         // Konten mode teks
  video_references?: VideoRef[];
  examples: CodeExample[];
  mini_quiz?: QuizQuestion[];
}

export interface VideoRef {
  title: string;
  youtube_id: string;
  timestamp_notes?: string;     // Catatan menit penting di video
}

export interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

// ── QUIZ ──────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;          // Penjelasan jawaban yang benar
}

// ── AI CHAT ───────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ── MISCONCEPTION DETECTION ───────────────────────────────────
export interface MisconceptionFeedback {
  question_id: string;
  user_selected: number;
  correct_index: number;
  misconception_label: string;  // Label singkat pola pikir salah
  correction_narrative: string; // Penjelasan mendalam untuk meluruskan
}

// ── NODE PROGRESS ─────────────────────────────────────────────
export interface NodeProgress {
  id: string;
  user_id: string;
  graph_id: string;
  node_id: string;
  status: NodeStatus;
  score: number;
  updated_at: string;
}
