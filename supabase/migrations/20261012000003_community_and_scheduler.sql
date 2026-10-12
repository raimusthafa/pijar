-- ================================================================
-- Migration 03: Community Discussions & Scheduler Persistence
-- ================================================================

-- 1. Community Posts
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

-- 2. User Study Tasks (Scheduler Task Checkbox Persistence)
CREATE TABLE IF NOT EXISTS public.user_study_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_key    TEXT NOT NULL,
  completed   BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, task_key)
);

-- RLS Enablement
ALTER TABLE public.community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_tasks  ENABLE ROW LEVEL SECURITY;

-- Community Posts Policies: Public view, authenticated create & update own
DROP POLICY IF EXISTS "Public can view community posts" ON public.community_posts;
CREATE POLICY "Public can view community posts" ON public.community_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own posts" ON public.community_posts;
CREATE POLICY "Authors can update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id);

-- Study Tasks Policies: Users manage own tasks
DROP POLICY IF EXISTS "Users can manage own study tasks" ON public.user_study_tasks;
CREATE POLICY "Users can manage own study tasks" ON public.user_study_tasks FOR ALL USING (auth.uid() = user_id);
