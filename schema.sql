-- ================================================================
-- PIJAR - Supabase Database Schema (Idempotent & Self-Contained)
-- Jalankan script ini di Supabase SQL Editor
-- Menggunakan fungsi bawaan PostgreSQL: gen_random_uuid()
-- ================================================================

-- ── 1. TABLE: profiles ───────────────────────────────────────────
-- Extends Supabase auth.users dengan preferensi belajar
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT,
  avatar_url     TEXT,
  learning_style TEXT CHECK (learning_style IN ('text', 'video')) DEFAULT 'text',
  target_goal    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. TABLE: learning_graphs ────────────────────────────────────
-- Menyimpan struktur Knowledge Graph kurikulum per user
CREATE TABLE IF NOT EXISTS public.learning_graphs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic        TEXT NOT NULL,
  nodes_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  status       TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. TABLE: node_progress ──────────────────────────────────────
-- Menyimpan status belajar per node konsep dalam graf
CREATE TABLE IF NOT EXISTS public.node_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  graph_id     UUID NOT NULL REFERENCES public.learning_graphs(id) ON DELETE CASCADE,
  node_id      TEXT NOT NULL,
  status       TEXT CHECK (status IN ('locked', 'prerequisite_gap', 'ready', 'in_progress', 'completed')) DEFAULT 'locked',
  score        INTEGER DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, graph_id, node_id)
);

-- ── 4. TABLE: chat_history ───────────────────────────────────────
-- Menyimpan riwayat percakapan AI Tutor per sesi materi
CREATE TABLE IF NOT EXISTS public.chat_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  graph_id     UUID REFERENCES public.learning_graphs(id) ON DELETE SET NULL,
  node_id      TEXT,
  role         TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. TABLE: diagnostic_logs ────────────────────────────────────
-- Menyimpan riwayat pre-test diagnostik dan hasil deteksi gap
CREATE TABLE IF NOT EXISTS public.diagnostic_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic                TEXT NOT NULL,
  answers_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  identified_gaps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. TABLE: concept_materials ──────────────────────────────────
-- Menyimpan cache materi pembelajaran terstruktur & skrip video interaktif
CREATE TABLE IF NOT EXISTS public.concept_materials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic            TEXT NOT NULL,
  node_id          TEXT NOT NULL,
  material_json    JSONB NOT NULL,
  video_scene_json JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (topic, node_id)
);

-- ── 7. ROW LEVEL SECURITY (RLS) ─────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_graphs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_materials ENABLE ROW LEVEL SECURITY;

-- ── 7. RLS POLICIES (Idempotent: DROP IF EXISTS terlebih dahulu) ──

-- Policies: profiles
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies: learning_graphs
DROP POLICY IF EXISTS "Users can manage own graphs"  ON public.learning_graphs;
CREATE POLICY "Users can manage own graphs"  ON public.learning_graphs FOR ALL USING (auth.uid() = user_id);

-- Policies: node_progress
DROP POLICY IF EXISTS "Users can manage own progress" ON public.node_progress;
CREATE POLICY "Users can manage own progress" ON public.node_progress FOR ALL USING (auth.uid() = user_id);

-- Policies: chat_history
DROP POLICY IF EXISTS "Users can manage own chat"    ON public.chat_history;
CREATE POLICY "Users can manage own chat"    ON public.chat_history FOR ALL USING (auth.uid() = user_id);

-- Policies: diagnostic_logs
DROP POLICY IF EXISTS "Users can manage own diagnostics" ON public.diagnostic_logs;
CREATE POLICY "Users can manage own diagnostics" ON public.diagnostic_logs FOR ALL USING (auth.uid() = user_id);

-- Policies: concept_materials (Cached educational content is accessible to all students)
DROP POLICY IF EXISTS "Public can view concept materials" ON public.concept_materials;
CREATE POLICY "Public can view concept materials" ON public.concept_materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can cache concept materials" ON public.concept_materials;
CREATE POLICY "Authenticated users can cache concept materials" ON public.concept_materials FOR ALL USING (auth.role() = 'authenticated');

-- ── 8. TRIGGER: Auto-create profile on user signup ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 9. OPTIONAL EXTENSIONS: community_posts & user_study_tasks ────
CREATE TABLE IF NOT EXISTS public.community_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  concept_tag   TEXT NOT NULL,
  category      TEXT CHECK (category IN ('question', 'insight', 'study_note')) DEFAULT 'question',
  upvotes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_study_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_key    TEXT NOT NULL,
  completed   BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, task_key)
);

ALTER TABLE public.community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_tasks  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view community posts" ON public.community_posts;
CREATE POLICY "Public can view community posts" ON public.community_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own posts" ON public.community_posts;
CREATE POLICY "Authors can update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can manage own study tasks" ON public.user_study_tasks;
CREATE POLICY "Users can manage own study tasks" ON public.user_study_tasks FOR ALL USING (auth.uid() = user_id);

