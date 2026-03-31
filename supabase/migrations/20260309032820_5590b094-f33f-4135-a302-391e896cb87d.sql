
-- Function to check and award badges based on user_progress
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  badge_row RECORD;
  criteria_type text;
  criteria_threshold int;
  user_value int;
BEGIN
  FOR badge_row IN SELECT * FROM public.badges LOOP
    criteria_type := badge_row.criteria->>'type';
    criteria_threshold := (badge_row.criteria->>'threshold')::int;
    
    -- Get the relevant user value
    IF criteria_type = 'xp' THEN
      user_value := NEW.xp;
    ELSIF criteria_type = 'quizzes_completed' THEN
      user_value := NEW.quizzes_completed;
    ELSIF criteria_type = 'streak_days' THEN
      user_value := NEW.streak_days;
    ELSE
      CONTINUE;
    END IF;
    
    -- Award badge if threshold met and not already earned
    IF user_value >= criteria_threshold THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (NEW.user_id, badge_row.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Add unique constraint to prevent duplicate badges
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_badge_unique UNIQUE (user_id, badge_id);

-- Trigger on user_progress updates
CREATE TRIGGER on_progress_check_badges
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();
