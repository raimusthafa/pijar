-- ================================================================
-- Migration 04: Learning goals, 5E workspaces, question bank,
--               spaced-review columns, evidence storage
-- ================================================================

-- 1. Learning goals (topic resolved to a concept, confirmed by the student)
CREATE TABLE IF NOT EXISTS public.learning_goals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  graph_id   UUID REFERENCES public.learning_graphs(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  node_id    TEXT,
  status     TEXT CHECK (status IN ('pending', 'active', 'done')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspaces (one 5E tutoring session per node)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  graph_id   UUID NOT NULL REFERENCES public.learning_graphs(id) ON DELETE CASCADE,
  node_id    TEXT NOT NULL,
  phase      TEXT CHECK (phase IN ('engage', 'explore', 'explain', 'elaborate', 'evaluate')) DEFAULT 'engage',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workspace events (chat, quiz answers, photos, canvas, phase changes)
CREATE TABLE IF NOT EXISTS public.workspace_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind         TEXT CHECK (kind IN ('chat', 'quiz', 'image', 'canvas', 'phase')) NOT NULL,
  role         TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  image_path   TEXT,
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workspace_events_ws_idx ON public.workspace_events (workspace_id, created_at);

-- 4. Question bank (generated once per node and level, reused)
CREATE TABLE IF NOT EXISTS public.question_bank (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic      TEXT NOT NULL,
  node_id    TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
  question   JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS question_bank_node_idx ON public.question_bank (topic, node_id, difficulty);

-- 5. Spaced-review state on node progress (Ebbinghaus-style retention)
ALTER TABLE public.node_progress ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.node_progress ADD COLUMN IF NOT EXISTS review_count     INTEGER DEFAULT 0;
ALTER TABLE public.node_progress ADD COLUMN IF NOT EXISTS stability_days   REAL    DEFAULT 1;

-- RLS
ALTER TABLE public.learning_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goals" ON public.learning_goals;
CREATE POLICY "Users manage own goals" ON public.learning_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own workspaces" ON public.workspaces;
CREATE POLICY "Users manage own workspaces" ON public.workspaces
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own workspace events" ON public.workspace_events;
CREATE POLICY "Users manage own workspace events" ON public.workspace_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Question bank: signed-in users read and add questions, nobody edits or deletes them
DROP POLICY IF EXISTS "Signed-in users read question bank" ON public.question_bank;
CREATE POLICY "Signed-in users read question bank" ON public.question_bank
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Signed-in users add questions" ON public.question_bank;
CREATE POLICY "Signed-in users add questions" ON public.question_bank
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Private storage for worksheet photos and canvas exports (folder = user id)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own evidence" ON storage.objects;
CREATE POLICY "Users upload own evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own evidence" ON storage.objects;
CREATE POLICY "Users read own evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
