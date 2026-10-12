-- ================================================================
-- Migration 01: Initial Core Schema & Authentication Trigger
-- ================================================================

-- 1. Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT,
  avatar_url     TEXT,
  learning_style TEXT CHECK (learning_style IN ('text', 'video')) DEFAULT 'text',
  target_goal    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Learning Graphs (Curriculum DAGs)
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

-- 3. Node Progress (Student Concept Mastery Tracking)
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

-- 4. Chat History (AI Tutor Sessions)
CREATE TABLE IF NOT EXISTS public.chat_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  graph_id     UUID REFERENCES public.learning_graphs(id) ON DELETE SET NULL,
  node_id      TEXT,
  role         TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Diagnostic Logs (Pre-test Assessments & Gap Results)
CREATE TABLE IF NOT EXISTS public.diagnostic_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic                TEXT NOT NULL,
  answers_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  identified_gaps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Learning Graphs Policies
DROP POLICY IF EXISTS "Users can manage own graphs"  ON public.learning_graphs;
CREATE POLICY "Users can manage own graphs"  ON public.learning_graphs FOR ALL USING (auth.uid() = user_id);

-- Node Progress Policies
DROP POLICY IF EXISTS "Users can manage own progress" ON public.node_progress;
CREATE POLICY "Users can manage own progress" ON public.node_progress FOR ALL USING (auth.uid() = user_id);

-- Chat History Policies
DROP POLICY IF EXISTS "Users can manage own chat"    ON public.chat_history;
CREATE POLICY "Users can manage own chat"    ON public.chat_history FOR ALL USING (auth.uid() = user_id);

-- Diagnostic Logs Policies
DROP POLICY IF EXISTS "Users can manage own diagnostics" ON public.diagnostic_logs;
CREATE POLICY "Users can manage own diagnostics" ON public.diagnostic_logs FOR ALL USING (auth.uid() = user_id);

-- Trigger: Profile creation upon auth.users signup
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
