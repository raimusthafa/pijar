-- ================================================================
-- Migration 02: Educational Concept Materials & Video Scene Cache
-- ================================================================

CREATE TABLE IF NOT EXISTS public.concept_materials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic            TEXT NOT NULL,
  node_id          TEXT NOT NULL,
  material_json    JSONB NOT NULL,
  video_scene_json JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (topic, node_id)
);

ALTER TABLE public.concept_materials ENABLE ROW LEVEL SECURITY;

-- Cached educational material is readable by all students
DROP POLICY IF EXISTS "Public can view concept materials" ON public.concept_materials;
CREATE POLICY "Public can view concept materials" ON public.concept_materials FOR SELECT USING (true);

-- Authenticated users or API handlers can insert/update cached material
DROP POLICY IF EXISTS "Authenticated users can cache concept materials" ON public.concept_materials;
CREATE POLICY "Authenticated users can cache concept materials" ON public.concept_materials FOR ALL USING (auth.role() = 'authenticated');
