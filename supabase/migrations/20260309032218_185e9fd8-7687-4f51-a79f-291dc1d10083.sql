
-- Flashcard Decks
CREATE TABLE public.flashcard_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decks" ON public.flashcard_decks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create decks" ON public.flashcard_decks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON public.flashcard_decks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON public.flashcard_decks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Flashcards with Leitner box fields
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  box INTEGER NOT NULL DEFAULT 1,
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON public.flashcards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create cards" ON public.flashcards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.flashcards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON public.flashcards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
