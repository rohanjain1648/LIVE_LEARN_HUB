
-- Code submissions
CREATE TABLE public.code_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  problem_description text NOT NULL,
  code text NOT NULL,
  language text NOT NULL DEFAULT 'javascript',
  ai_score integer,
  ai_feedback text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all submissions" ON public.code_submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own submissions" ON public.code_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own submissions" ON public.code_submissions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Peer reviews
CREATE TABLE public.code_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.code_submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  readability_score integer NOT NULL DEFAULT 3,
  correctness_score integer NOT NULL DEFAULT 3,
  efficiency_score integer NOT NULL DEFAULT 3,
  feedback text NOT NULL,
  review_quality_score integer,
  xp_earned integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.code_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reviews" ON public.code_reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own reviews" ON public.code_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
