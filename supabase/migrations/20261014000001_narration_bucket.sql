-- Migration: 20261014000001_narration_bucket.sql
-- Description: Create public storage bucket for cached Gemini TTS narration audio clips

INSERT INTO storage.buckets (id, name, public)
VALUES ('narration', 'narration', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users insert narration" ON storage.objects;
CREATE POLICY "Authenticated users insert narration" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'narration');

DROP POLICY IF EXISTS "Public read narration" ON storage.objects;
CREATE POLICY "Public read narration" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'narration');
