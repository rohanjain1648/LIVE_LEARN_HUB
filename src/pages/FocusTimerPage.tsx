import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain, Zap, Clock, Trophy, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type TimerMode = "focus" | "short-break" | "long-break";

interface ModeConfig {
  label: string;
  minutes: number;
  icon: typeof Brain;
}

const DEFAULT_DURATIONS = { focus: 25, "short-break": 5, "long-break": 15 };
const XP_PER_SESSION = 50;

function loadDurations(): Record<TimerMode, number> {
  try {
    const saved = localStorage.getItem("pomodoro-durations");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ...DEFAULT_DURATIONS };
}

function saveDurations(d: Record<TimerMode, number>) {
  localStorage.setItem("pomodoro-durations", JSON.stringify(d));
}

export default function FocusTimerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [durations, setDurations] = useState<Record<TimerMode, number>>(loadDurations);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(loadDurations().focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const modes: Record<TimerMode, ModeConfig> = {
    focus: { label: "Focus", minutes: durations.focus, icon: Brain },
    "short-break": { label: "Short Break", minutes: durations["short-break"], icon: Coffee },
    "long-break": { label: "Long Break", minutes: durations["long-break"], icon: Coffee },
  };

  const totalSeconds = durations[mode] * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const { data: todaySessions } = useQuery({
    queryKey: ["focus_sessions_today", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .gte("completed_at", today.toISOString())
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allSessions } = useQuery({
    queryKey: ["focus_sessions_all", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const completeSession = useCallback(async () => {
    if (!user || mode !== "focus") return;

    await supabase.from("focus_sessions").insert({
      user_id: user.id,
      duration_minutes: durations.focus,
      completed: true,
      xp_earned: XP_PER_SESSION,
      completed_at: new Date().toISOString(),
    });

    const { data: prog } = await supabase
      .from("user_progress")
      .select("xp")
      .eq("user_id", user.id)
      .single();

    if (prog) {
      await supabase
        .from("user_progress")
        .update({ xp: prog.xp + XP_PER_SESSION, last_activity_date: new Date().toISOString().split("T")[0] })
        .eq("user_id", user.id);
    }

    setSessions((s) => s + 1);
    queryClient.invalidateQueries({ queryKey: ["focus_sessions_today"] });
    queryClient.invalidateQueries({ queryKey: ["focus_sessions_all"] });
    queryClient.invalidateQueries({ queryKey: ["user_progress"] });

    toast({
      title: "🎉 Session complete!",
      description: `+${XP_PER_SESSION} XP earned. Great focus!`,
    });
  }, [user, mode, durations, queryClient, toast]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, completeSession]);

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setMode(newMode);
    setSecondsLeft(durations[newMode] * 60);
  };

  const reset = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setSecondsLeft(durations[mode] * 60);
  };

  const updateDuration = (m: TimerMode, val: number) => {
    const updated = { ...durations, [m]: val };
    setDurations(updated);
    saveDurations(updated);
    if (m === mode && !isRunning) {
      setSecondsLeft(val * 60);
    }
  };

  const todayXP = (todaySessions || []).reduce((sum: number, s: any) => sum + (s.xp_earned || 0), 0);
  const todayCount = todaySessions?.length || 0;
  const totalMinutes = (allSessions || []).reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

  const size = 280;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Focus Timer</h1>
          <p className="mt-1 text-muted-foreground">Stay focused, earn XP. Every session counts.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-5">
              <p className="font-display font-semibold text-sm">Timer Durations</p>
              {(["focus", "short-break", "long-break"] as TimerMode[]).map((m) => (
                <div key={m} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>{modes[m].label}</Label>
                    <span className="text-muted-foreground font-medium">{durations[m]} min</span>
                  </div>
                  <Slider
                    value={[durations[m]]}
                    onValueChange={([v]) => updateDuration(m, v)}
                    min={m === "focus" ? 5 : 1}
                    max={m === "focus" ? 90 : 30}
                    step={1}
                    disabled={isRunning}
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setDurations({ ...DEFAULT_DURATIONS });
                  saveDurations({ ...DEFAULT_DURATIONS });
                  if (!isRunning) setSecondsLeft(DEFAULT_DURATIONS[mode] * 60);
                }}
                disabled={isRunning}
              >
                Reset to defaults
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>

      {/* Mode Tabs */}
      <div className="flex gap-2 justify-center">
        {(Object.keys(modes) as TimerMode[]).map((m) => {
          const Icon = modes[m].icon;
          return (
            <Button
              key={m}
              variant={mode === m ? "default" : "outline"}
              size="sm"
              onClick={() => switchMode(m)}
              className={mode === m ? "bg-gradient-primary text-primary-foreground" : ""}
            >
              <Icon className="h-4 w-4 mr-1.5" />
              {modes[m].label} ({durations[m]}m)
            </Button>
          );
        })}
      </div>

      {/* Timer */}
      <motion.div
        className="flex justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 w-full max-w-sm">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
                <motion.circle
                  cx={size / 2} cy={size / 2} r={radius} fill="none"
                  stroke={mode === "focus" ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                  strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  initial={false} animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-6xl font-bold tabular-nums">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
                <span className="text-sm text-muted-foreground mt-1 capitalize">{modes[mode].label}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={() => setIsRunning(!isRunning)}
                className={isRunning ? "bg-destructive hover:bg-destructive/90" : "bg-gradient-primary text-primary-foreground hover:opacity-90"}
              >
                {isRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                {isRunning ? "Pause" : "Start"}
              </Button>
              <Button size="lg" variant="outline" onClick={reset}>
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            {mode === "focus" && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" /> +{XP_PER_SESSION} XP on completion
              </Badge>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: "Today's Sessions", value: todayCount, color: "text-primary" },
          { icon: Zap, label: "Today's XP", value: todayXP, color: "text-success" },
          { icon: Trophy, label: "Total Sessions", value: allSessions?.length || 0, color: "text-accent" },
          { icon: Brain, label: "Total Focus", value: `${totalMinutes}m`, color: "text-warning" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
                <div>
                  <p className="font-display text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Sessions */}
      <AnimatePresence>
        {todaySessions && todaySessions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-lg">Today's Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todaySessions.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span>{s.duration_minutes} min focus</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">+{s.xp_earned} XP</Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(s.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}