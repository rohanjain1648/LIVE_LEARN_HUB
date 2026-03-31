
-- Concept maps table
CREATE TABLE IF NOT EXISTS public.concept_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Map',
  source_text text,
  nodes jsonb NOT NULL DEFAULT '[]',
  edges jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.concept_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maps" ON public.concept_maps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maps" ON public.concept_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maps" ON public.concept_maps
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maps" ON public.concept_maps
  FOR DELETE USING (auth.uid() = user_id);

-- Misconception corrections table
CREATE TABLE IF NOT EXISTS public.misconception_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  misconception text NOT NULL,
  correction_module jsonb NOT NULL DEFAULT '{}',
  quiz_context jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.misconception_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections" ON public.misconception_corrections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own corrections" ON public.misconception_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own corrections" ON public.misconception_corrections
  FOR UPDATE USING (auth.uid() = user_id);

-- Socratic sessions table
CREATE TABLE IF NOT EXISTS public.socratic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  reasoning_depth integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.socratic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.socratic_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.socratic_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.socratic_sessions
  FOR UPDATE USING (auth.uid() = user_id);
