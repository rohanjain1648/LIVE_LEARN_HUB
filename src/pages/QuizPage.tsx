import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, Users, Clock, ArrowRight, ArrowLeft, Crown, Trophy,
  CheckCircle, XCircle, Loader2, Copy, Hash,
} from "lucide-react";
import { useState } from "react";
import { useQuizRoom } from "@/hooks/useQuizRoom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type View = "lobby" | "create" | "join" | "room" | "playing" | "results";

export default function QuizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const quiz = useQuizRoom();
  const [view, setView] = useState<View>("lobby");
  const [joinCode, setJoinCode] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [topicText, setTopicText] = useState("");
  const [generating, setGenerating] = useState(false);

  // Derive view from room state
  const effectiveView = quiz.room
    ? quiz.room.status === "finished" ? "results"
      : quiz.room.status === "playing" ? "playing"
      : "room"
    : view;

  const handleCreateRoom = async () => {
    if (!roomTitle.trim() || !topicText.trim()) {
      toast({ title: "Fill in both fields", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { content: topicText.trim(), count: 5 },
      });
      if (error) throw error;
      if (!data?.questions?.length) throw new Error("No questions generated");

      await quiz.createRoom(roomTitle.trim(), data.questions);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate quiz", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 4) {
      toast({ title: "Enter a valid code", variant: "destructive" });
      return;
    }
    await quiz.joinRoom(joinCode.trim());
  };

  const copyCode = () => {
    if (quiz.room?.code) {
      navigator.clipboard.writeText(quiz.room.code);
      toast({ title: "Code copied!" });
    }
  };

  // LOBBY VIEW
  if (effectiveView === "lobby" || (!quiz.room && (view === "lobby"))) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold">Live Quiz Arena ⚡</h1>
          <p className="mt-1 text-muted-foreground">Join a live quiz or create your own room.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card
            className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
            onClick={() => setView("create")}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold">Create Quiz Room</h3>
              <p className="text-sm text-muted-foreground">AI generates questions from your topic</p>
            </CardContent>
          </Card>

          <Card
            className="border-dashed border-2 border-accent/30 bg-accent/5 hover:bg-accent/10 cursor-pointer transition-colors"
            onClick={() => setView("join")}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                <Hash className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold">Join with Code</h3>
              <p className="text-sm text-muted-foreground">Enter a room code to join instantly</p>
            </CardContent>
          </Card>
        </div>

        {quiz.activeRooms.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Active Rooms</h2>
            <div className="space-y-3">
              {quiz.activeRooms.map((r) => (
                <Card key={r.id} className="border-border/50 hover:shadow-md transition-all">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{r.title}</h3>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{r.code}</span>
                        <span className="capitalize">{r.status}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                      onClick={() => quiz.joinRoomById(r.id)}
                      disabled={r.status === "finished"}
                    >
                      Join <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // CREATE VIEW
  if (!quiz.room && view === "create") {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setView("lobby")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="font-display text-2xl font-bold">Create Quiz Room</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Room Title</label>
            <Input
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="e.g. Biology Midterm Review"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Topic / Study Material</label>
            <Textarea
              value={topicText}
              onChange={(e) => setTopicText(e.target.value)}
              placeholder="Paste notes, describe a topic, or enter key concepts. AI will generate 5 quiz questions from this."
              className="min-h-[160px]"
            />
          </div>
          <Button
            onClick={handleCreateRoom}
            disabled={generating || !roomTitle.trim() || !topicText.trim()}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Quiz...</>
            ) : (
              <><Zap className="mr-2 h-4 w-4" /> Create & Generate Questions</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // JOIN VIEW
  if (!quiz.room && view === "join") {
    return (
      <div className="p-6 md:p-8 max-w-md mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setView("lobby")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="font-display text-2xl font-bold">Join Quiz Room</h1>
        <div className="space-y-4">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter room code (e.g. ABC123)"
            maxLength={6}
            className="text-center text-2xl font-mono tracking-widest h-14"
          />
          <Button
            onClick={handleJoin}
            disabled={joinCode.trim().length < 4}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            Join Room <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // WAITING ROOM
  if (effectiveView === "room") {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={quiz.leaveRoom} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Leave Room
        </Button>

        <div className="text-center space-y-3">
          <h1 className="font-display text-2xl font-bold">{quiz.room?.title}</h1>
          <div className="inline-flex items-center gap-2 bg-muted rounded-xl px-6 py-3">
            <span className="text-sm text-muted-foreground">Room Code:</span>
            <span className="font-mono text-2xl font-bold tracking-widest text-primary">{quiz.room?.code}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">{quiz.questions.length} questions • Waiting for players...</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Players ({quiz.participants.length})
            </h3>
            <div className="space-y-2">
              {quiz.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm flex-1">{p.display_name}</span>
                  {p.user_id === quiz.room?.host_id && (
                    <Crown className="h-4 w-4 text-warning" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {quiz.isHost && (
          <Button
            onClick={quiz.startQuiz}
            disabled={quiz.participants.length < 1}
            className="w-full h-14 text-lg bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Zap className="mr-2 h-5 w-5" /> Start Quiz
          </Button>
        )}
        {!quiz.isHost && (
          <p className="text-center text-muted-foreground">Waiting for the host to start...</p>
        )}
      </div>
    );
  }

  // PLAYING VIEW
  if (effectiveView === "playing" && quiz.currentQuestion) {
    const q = quiz.currentQuestion;
    const totalQ = quiz.questions.length;
    const qNum = (quiz.room?.current_question_index ?? 0) + 1;
    const timerPct = q.time_limit_seconds > 0 ? (quiz.timeLeft / q.time_limit_seconds) * 100 : 0;

    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Question {qNum} of {totalQ}</span>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={`font-mono text-lg font-bold ${quiz.timeLeft <= 5 ? "text-destructive" : "text-foreground"}`}>
              {quiz.timeLeft}s
            </span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${quiz.timeLeft <= 5 ? "bg-destructive" : "bg-gradient-primary"}`}
            initial={{ width: "100%" }}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>

        {/* Question */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h2 className="font-display text-xl font-semibold">{q.question}</h2>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="grid gap-3">
          <AnimatePresence>
            {(q.options as string[]).map((opt, idx) => {
              const colors = ["border-primary bg-primary/5", "border-accent bg-accent/5", "border-warning bg-warning/5", "border-success bg-success/5"];
              const selected = quiz.hasAnswered; // we don't track which was selected in state, but we show feedback
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  onClick={() => quiz.submitAnswer(idx)}
                  disabled={quiz.hasAnswered || quiz.timeLeft <= 0}
                  className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    quiz.hasAnswered ? "opacity-70 cursor-default" : `hover:scale-[1.01] cursor-pointer ${colors[idx % 4]}`
                  }`}
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-card border flex items-center justify-center font-display font-bold text-lg">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 font-medium">{opt}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {quiz.hasAnswered && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <p className="text-lg font-medium text-muted-foreground">Answer submitted! Waiting for next question...</p>
          </motion.div>
        )}

        {quiz.timeLeft <= 0 && !quiz.hasAnswered && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <p className="text-lg font-medium text-destructive">Time's up!</p>
          </motion.div>
        )}

        {/* Host: next question button when time is up */}
        {quiz.isHost && quiz.timeLeft <= 0 && (
          <Button
            onClick={quiz.nextQuestion}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            {qNum >= totalQ ? "Show Results" : "Next Question"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {/* Mini leaderboard */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-warning" /> Live Scores
            </h3>
            <div className="space-y-1.5">
              {quiz.participants.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-center font-bold text-muted-foreground">{i + 1}</span>
                  <span className={`flex-1 ${p.user_id === user?.id ? "text-primary font-semibold" : ""}`}>{p.display_name}</span>
                  {p.last_answer_correct === true && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                  {p.last_answer_correct === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  <span className="font-mono font-bold">{p.score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RESULTS VIEW
  if (effectiveView === "results") {
    const sorted = [...quiz.participants].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(p => p.user_id === user?.id) + 1;

    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-warm mx-auto">
            <Trophy className="h-10 w-10 text-warning-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Quiz Complete! 🎉</h1>
          <p className="text-muted-foreground">
            {quiz.room?.title} • You placed #{myRank} of {sorted.length}
          </p>
        </motion.div>

        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {sorted.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-4 px-6 py-4 border-b border-border/30 last:border-0 ${
                  p.user_id === user?.id ? "bg-primary/5" : ""
                }`}
              >
                <div className="w-8 flex justify-center">
                  {i === 0 ? <Crown className="h-6 w-6 text-warning" /> :
                   <span className="font-bold text-lg text-muted-foreground">{i + 1}</span>}
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <span className={`flex-1 font-medium ${p.user_id === user?.id ? "text-primary font-semibold" : ""}`}>
                  {p.display_name}
                  {p.user_id === user?.id && " (You)"}
                </span>
                <span className="font-display text-xl font-bold">{p.score}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={() => { quiz.leaveRoom(); setView("lobby"); }}
          variant="outline"
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lobby
        </Button>
      </div>
    );
  }

  // Fallback
  return null;
}
