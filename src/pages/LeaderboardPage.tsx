import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Flame } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-warning" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-warning/70" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
};

export default function LeaderboardPage() {
  const { user } = useAuth();

  const { data: leaders, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("*, profiles(display_name, avatar_url)")
        .order("xp", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-7 w-7 text-warning" /> Leaderboard
        </h1>
        <p className="mt-1 text-muted-foreground">Top learners by XP</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : leaders && leaders.length > 0 ? (
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {leaders.map((l: any, i: number) => {
              const name = l.profiles?.display_name || "Player";
              const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              const isMe = l.user_id === user?.id;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-border/30 last:border-0 ${isMe ? "bg-primary/5" : ""}`}
                >
                  <div className="w-8 flex justify-center">{rankIcon(i + 1)}</div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={i < 3 ? "bg-gradient-primary text-primary-foreground text-xs" : "text-xs"}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isMe ? "text-primary font-semibold" : ""}`}>
                      {name}{isMe && " (You)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 text-warning" />
                    {l.streak_days}
                  </div>
                  <div className="font-display font-bold text-sm w-16 text-right">
                    {l.xp.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">XP</span>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No players yet. Be the first to earn XP!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
