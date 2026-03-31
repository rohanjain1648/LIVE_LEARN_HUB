import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, BookOpen, MessageCircle, Trophy, Flame, Target, Clock, TrendingUp, BarChart3,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MoodCheckIn, useMoodCheckIn } from "@/components/MoodCheckIn";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const quickActions = [
  { icon: Zap, label: "Live Quiz", path: "/quiz", gradient: "bg-gradient-primary" },
  { icon: BookOpen, label: "Study", path: "/study", gradient: "bg-gradient-warm" },
  { icon: MessageCircle, label: "AI Tutor", path: "/chat", gradient: "bg-gradient-accent" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard", gradient: "bg-gradient-primary" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// Generate mock weekly XP data (will be real once we track daily XP)
function generateWeeklyXP(totalXp: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0=Sun
  return days.map((d, i) => ({
    day: d,
    xp: i <= (today === 0 ? 6 : today - 1) ? Math.round((totalXp / 7) * (0.5 + Math.random())) : 0,
  }));
}

function generateQuizScores(quizzesCompleted: number) {
  return Array.from({ length: Math.min(quizzesCompleted, 10) }, (_, i) => ({
    quiz: `Q${i + 1}`,
    score: Math.round(40 + Math.random() * 60),
  }));
}

const subjectData = [
  { subject: "Biology", level: 72 },
  { subject: "Physics", level: 58 },
  { subject: "Math", level: 85 },
  { subject: "History", level: 45 },
  { subject: "Chemistry", level: 63 },
];

function getLevelInfo(xp: number) {
  const levels = [
    { level: 1, name: "Beginner", threshold: 0 },
    { level: 2, name: "Curious Mind", threshold: 200 },
    { level: 3, name: "Quick Learner", threshold: 500 },
    { level: 4, name: "Knowledge Seeker", threshold: 1000 },
    { level: 5, name: "Curious Explorer", threshold: 2000 },
    { level: 6, name: "Study Pro", threshold: 3500 },
    { level: 7, name: "Quiz Master", threshold: 5000 },
    { level: 8, name: "Scholar", threshold: 8000 },
    { level: 9, name: "Genius", threshold: 12000 },
    { level: 10, name: "Legend", threshold: 20000 },
  ];
  let current = levels[0];
  let next = levels[1];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].threshold) {
      current = levels[i];
      next = levels[i + 1] || levels[i];
      break;
    }
  }
  const progress = next.threshold > current.threshold
    ? ((xp - current.threshold) / (next.threshold - current.threshold)) * 100
    : 100;
  return { ...current, next, progress, xpToNext: next.threshold - xp };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shouldShow: showMood, mood, handleComplete: handleMoodComplete } = useMoodCheckIn();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ["user_progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_progress").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: badges } = useQuery({
    queryKey: ["user_badges", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recentQuizzes } = useQuery({
    queryKey: ["recent_quizzes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_room_participants")
        .select("*, quiz_rooms(title, status, created_at)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const xp = progress?.xp || 0;
  const quizzes = progress?.quizzes_completed || 0;
  const streak = progress?.streak_days || 0;
  const levelInfo = getLevelInfo(xp);
  const weeklyXP = generateWeeklyXP(xp);
  const quizScores = generateQuizScores(quizzes || 3);
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Learner";

  const statCards = [
    { icon: Flame, label: "Day Streak", value: `${streak}`, color: "text-warning" },
    { icon: Target, label: "Quizzes Done", value: `${quizzes}`, color: "text-primary" },
    { icon: BarChart3, label: "Level", value: `${levelInfo.level}`, color: "text-accent" },
    { icon: TrendingUp, label: "Total XP", value: xp.toLocaleString(), color: "text-success" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Mood Check-In */}
      {showMood && <MoodCheckIn onComplete={handleMoodComplete} />}

      {/* Mood Banner */}
      {mood && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-muted p-4 flex items-center gap-3">
          <span className="text-2xl">{mood.label === "Happy" ? "😊" : mood.label === "Calm" ? "😌" : mood.label === "Tired" ? "😴" : mood.label === "Anxious" ? "😰" : mood.label === "Frustrated" ? "😤" : "🤔"}</span>
          <div>
            <p className="text-sm font-medium">Today's plan: {mood.recommendation}</p>
          </div>
        </motion.div>
      )}

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold">Welcome back, {displayName}! 👋</h1>
        <p className="mt-1 text-muted-foreground">
          Level {levelInfo.level} — {levelInfo.name} • {levelInfo.xpToNext > 0 ? `${levelInfo.xpToNext} XP to ${levelInfo.next.name}` : "Max level!"}
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((a) => (
          <motion.div key={a.label} variants={item}>
            <Button
              variant="outline"
              onClick={() => navigate(a.path)}
              className="w-full h-auto flex-col gap-3 py-6 bg-card hover:bg-muted/50 border-border/50"
            >
              <div className={`h-10 w-10 rounded-xl ${a.gradient} flex items-center justify-center`}>
                <a.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-medium">{a.label}</span>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <motion.div key={s.label} variants={item}>
            <Card className="border-border/50">
              <CardContent className="p-5 flex items-center gap-4">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Level Progress */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Level {levelInfo.level} — {levelInfo.name}</span>
            <span className="text-muted-foreground">{xp.toLocaleString()} / {levelInfo.next.threshold.toLocaleString()} XP</span>
          </div>
          <Progress value={levelInfo.progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly XP Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Weekly XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyXP}>
                <defs>
                  <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <Tooltip
                  contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(214, 20%, 90%)", borderRadius: "8px", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="xp" stroke="hsl(168, 80%, 36%)" fill="url(#xpGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quiz Scores Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" /> Quiz Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quizScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="quiz" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <Tooltip
                  contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(214, 20%, 90%)", borderRadius: "8px", fontSize: 12 }}
                />
                <Bar dataKey="score" fill="hsl(262, 70%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Subject Mastery + Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Subject Radar */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Subject Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={subjectData}>
                <PolarGrid stroke="hsl(214, 20%, 90%)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Mastery" dataKey="level" stroke="hsl(168, 80%, 36%)" fill="hsl(168, 80%, 36%)" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Quiz Activity */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentQuizzes && recentQuizzes.length > 0 ? (
              <div className="space-y-4">
                {recentQuizzes.map((q: any, i: number) => (
                  <div key={q.id || i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{q.quiz_rooms?.title || "Quiz"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{q.quiz_rooms?.status || "completed"}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{q.score} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No quizzes yet. Start one!</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/quiz")}>
                  <Zap className="mr-2 h-3.5 w-3.5" /> Go to Quiz Arena
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {badges.map((ub: any) => (
                <div key={ub.id} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
                  <span className="text-lg">{ub.badges?.icon || "🏆"}</span>
                  <span className="text-sm font-medium">{ub.badges?.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
