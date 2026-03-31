import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const moods = [
  { emoji: "😊", label: "Happy", recommendation: "Great energy! Let's tackle challenging material." },
  { emoji: "😌", label: "Calm", recommendation: "Perfect for deep focus and complex topics." },
  { emoji: "😴", label: "Tired", recommendation: "Light review and audio-based learning today." },
  { emoji: "😰", label: "Anxious", recommendation: "Starting with easy wins to build confidence." },
  { emoji: "😤", label: "Frustrated", recommendation: "Short quiz bursts with instant rewards." },
  { emoji: "🤔", label: "Curious", recommendation: "Explore new topics and challenge yourself!" },
];

interface MoodCheckInProps {
  onComplete: (mood: string, recommendation: string) => void;
}

export function MoodCheckIn({ onComplete }: MoodCheckInProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);

  const handleSelect = async (index: number) => {
    setSelected(index);
    const mood = moods[index];

    if (user) {
      await supabase.from("mood_checkins").insert({
        user_id: user.id,
        mood: mood.label,
        energy_level: index <= 1 ? 5 : index <= 3 ? 2 : 3,
      });
    }

    setTimeout(() => {
      setVisible(false);
      setTimeout(() => onComplete(mood.label, mood.recommendation), 400);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground mb-2"
            >
              Before we start...
            </motion.p>
            <h2 className="font-display text-xl font-bold mb-6">How are you feeling?</h2>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {moods.map((m, i) => (
                <motion.button
                  key={m.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleSelect(i)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all ${
                    selected === i
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-xs font-medium">{m.label}</span>
                </motion.button>
              ))}
            </div>

            {selected !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-muted text-sm text-muted-foreground"
              >
                {moods[selected].recommendation}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useMoodCheckIn() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [mood, setMood] = useState<{ label: string; recommendation: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    // Check if user already checked in today
    const checkToday = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mood_checkins")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", today)
        .limit(1);
      setShouldShow(!data || data.length === 0);
    };
    checkToday();
  }, [user]);

  const handleComplete = (label: string, recommendation: string) => {
    setMood({ label, recommendation });
    setShouldShow(false);
  };

  return { shouldShow, mood, handleComplete };
}
