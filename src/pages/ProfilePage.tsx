import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Settings, Trophy, Flame, Target, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  return { ...current, next, progress, xpToNext: Math.max(0, next.threshold - xp) };
}

export default function ProfilePage() {
  const { user } = useAuth();

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
      const { data } = await supabase.from("user_badges").select("*, badges(*)").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const xp = progress?.xp || 0;
  const quizzes = progress?.quizzes_completed || 0;
  const streak = progress?.streak_days || 0;
  const levelInfo = getLevelInfo(xp);
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{profile?.role_preference || "student"}</Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { icon: Target, label: "Quizzes", value: `${quizzes}`, color: "text-primary" },
          { icon: Flame, label: "Streak", value: `${streak} days`, color: "text-warning" },
          { icon: Trophy, label: "XP", value: xp.toLocaleString(), color: "text-accent" },
          { icon: TrendingUp, label: "Level", value: `${levelInfo.level}`, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-5 flex items-center gap-3">
              <s.icon className={`h-6 w-6 ${s.color}`} />
              <div>
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg">Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span>Level {levelInfo.level} — {levelInfo.name}</span>
            <span className="text-muted-foreground">{xp.toLocaleString()} / {levelInfo.next.threshold.toLocaleString()} XP</span>
          </div>
          <Progress value={levelInfo.progress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {levelInfo.xpToNext > 0 ? `${levelInfo.xpToNext.toLocaleString()} XP to Level ${levelInfo.next.level} — ${levelInfo.next.name}` : "Max level reached! 🎉"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg">Badges</CardTitle>
        </CardHeader>
        <CardContent>
          {badges && badges.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {badges.map((ub: any) => (
                <div key={ub.id} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
                  <span className="text-lg">{ub.badges?.icon || "🏆"}</span>
                  <span className="text-sm font-medium">{ub.badges?.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Complete quizzes and challenges to earn badges!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
