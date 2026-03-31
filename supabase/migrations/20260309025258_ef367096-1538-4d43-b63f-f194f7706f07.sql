-- Quiz room status enum
CREATE TYPE public.quiz_room_status AS ENUM ('waiting', 'playing', 'finished');

-- Quiz rooms
CREATE TABLE public.quiz_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status quiz_room_status NOT NULL DEFAULT 'waiting',
  current_question_index INTEGER NOT NULL DEFAULT -1,
  question_end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view rooms" ON public.quiz_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create rooms" ON public.quiz_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update room" ON public.quiz_rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Host can delete room" ON public.quiz_rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- Quiz room questions
CREATE TABLE public.quiz_room_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  time_limit_seconds INTEGER NOT NULL DEFAULT 20
);
ALTER TABLE public.quiz_room_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view room questions" ON public.quiz_room_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Host can insert questions" ON public.quiz_room_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_rooms WHERE id = room_id AND host_id = auth.uid()));
CREATE POLICY "Host can update questions" ON public.quiz_room_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_rooms WHERE id = room_id AND host_id = auth.uid()));

-- Quiz room participants
CREATE TABLE public.quiz_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Player',
  score INTEGER NOT NULL DEFAULT 0,
  last_answer_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
ALTER TABLE public.quiz_room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view participants" ON public.quiz_room_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join rooms" ON public.quiz_room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participant" ON public.quiz_room_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Quiz room answers (track per-question answers)
CREATE TABLE public.quiz_room_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_room_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);
ALTER TABLE public.quiz_room_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view answers" ON public.quiz_room_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can submit answers" ON public.quiz_room_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_room_answers;