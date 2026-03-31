
-- Study Groups
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view groups" ON public.study_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create groups" ON public.study_groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update group" ON public.study_groups
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete group" ON public.study_groups
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Study Group Members
CREATE TABLE public.study_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Member',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view members" ON public.study_group_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join groups" ON public.study_group_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON public.study_group_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.study_group_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Study Group Messages (real-time chat)
CREATE TABLE public.study_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.study_group_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_messages.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can send messages" ON public.study_group_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_messages.group_id AND user_id = auth.uid())
  );

-- Study Group Notes (shared collaborative notes)
CREATE TABLE public.study_group_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_group_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notes" ON public.study_group_notes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_notes.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can create notes" ON public.study_group_notes
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = study_group_notes.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Authors can update notes" ON public.study_group_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete notes" ON public.study_group_notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_members;
