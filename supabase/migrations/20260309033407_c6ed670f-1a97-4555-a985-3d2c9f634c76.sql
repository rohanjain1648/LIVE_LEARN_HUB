
-- Create storage bucket for screenshot uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);

-- Allow authenticated users to upload
CREATE POLICY "Users can upload screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read own screenshots
CREATE POLICY "Users can view own screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read for display
CREATE POLICY "Public can view screenshots" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'screenshots');

-- Create table for saved explanations
CREATE TABLE public.screenshot_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  explanation text NOT NULL,
  quiz jsonb DEFAULT '[]'::jsonb,
  title text DEFAULT 'Untitled',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screenshot_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own explanations" ON public.screenshot_explanations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own explanations" ON public.screenshot_explanations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own explanations" ON public.screenshot_explanations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
