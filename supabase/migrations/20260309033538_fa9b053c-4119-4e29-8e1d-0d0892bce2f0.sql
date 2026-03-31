
CREATE TABLE public.mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood text NOT NULL,
  energy_level integer NOT NULL DEFAULT 3,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.mood_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON public.mood_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
