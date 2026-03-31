import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Target, BookOpen, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface WrongAnswer {
  question: string;
  studentAnswer: string;
  correctAnswer: string;
}

interface Misconception {
  title: string;
  what_student_thinks: string;
  why_its_wrong: string;
  correct_concept: string;
  analogy: string;
  practice_question: string;
  practice_answer: string;
  severity: "minor" | "moderate" | "fundamental";
}

interface AnalysisResult {
  misconceptions: Misconception[];
  overall_assessment: string;
  study_priority: string;
}

const severityStyles = {
  minor: "border-yellow-500/30 bg-yellow-500/5",
  moderate: "border-orange-500/30 bg-orange-500/5",
  fundamental: "border-red-500/30 bg-red-500/5",
};

const severityIcons = {
  minor: "🟡",
  moderate: "🟠",
  fundamental: "🔴",
};

export default function MisconceptionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([
    { question: "", studentAnswer: "", correctAnswer: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceRevealed, setPracticeRevealed] = useState<Record<number, boolean>>({});

  const { data: savedCorrections } = useQuery({
    queryKey: ["misconception_corrections", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("misconception_corrections")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const addWrongAnswer = () => {
    setWrongAnswers([...wrongAnswers, { question: "", studentAnswer: "", correctAnswer: "" }]);
  };

  const updateWrongAnswer = (idx: number, field: keyof WrongAnswer, value: string) => {
    const updated = [...wrongAnswers];
    updated[idx][field] = value;
    setWrongAnswers(updated);
  };

  const removeWrongAnswer = (idx: number) => {
    if (wrongAnswers.length > 1) {
      setWrongAnswers(wrongAnswers.filter((_, i) => i !== idx));
    }
  };

  const analyze = async () => {
    const validAnswers = wrongAnswers.filter((wa) => wa.question && wa.studentAnswer && wa.correctAnswer);
    if (!topic.trim() || validAnswers.length === 0) {
      toast({ title: "Fill in the topic and at least one wrong answer", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("misconception-radar", {
        body: { topic, wrongAnswers: validAnswers },
      });
      if (error) throw error;
      setResult(data);
      setExpandedIdx(null);
      setPracticeAnswers({});
      setPracticeRevealed({});

      // Save to DB
      if (user && data.misconceptions?.length) {
        for (const m of data.misconceptions) {
          await supabase.from("misconception_corrections").insert({
            user_id: user.id,
            topic,
            misconception: m.title,
            correction_module: m,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["misconception_corrections"] });
      }
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTopic("");
    setWrongAnswers([{ question: "", studentAnswer: "", correctAnswer: "" }]);
    setResult(null);
    setExpandedIdx(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" /> Misconception Radar
        </h1>
        <p className="text-muted-foreground mt-1">
          Not just "wrong" — we identify the EXACT mental error and create a targeted correction.
        </p>
      </motion.div>

      {!result ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Enter Quiz Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Topic / Subject</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Cell Biology, Newton's Laws, French Revolution"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">Wrong Answers</label>
                {wrongAnswers.map((wa, idx) => (
                  <Card key={idx} className="border-border/30 bg-muted/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Question {idx + 1}</span>
                        {wrongAnswers.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeWrongAnswer(idx)}>
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="What was the question?"
                        value={wa.question}
                        onChange={(e) => updateWrongAnswer(idx, "question", e.target.value)}
                      />
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Student's answer (wrong)</label>
                          <Input
                            placeholder="What did you answer?"
                            value={wa.studentAnswer}
                            onChange={(e) => updateWrongAnswer(idx, "studentAnswer", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Correct answer</label>
                          <Input
                            placeholder="What was correct?"
                            value={wa.correctAnswer}
                            onChange={(e) => updateWrongAnswer(idx, "correctAnswer", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addWrongAnswer} className="w-full border-dashed">
                  + Add Another Wrong Answer
                </Button>
              </div>

              <Button onClick={analyze} disabled={loading || !topic.trim()} className="w-full">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Misconceptions...</>
                ) : (
                  <><Target className="mr-2 h-4 w-4" /> Detect Misconceptions</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Overall Assessment */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{result.overall_assessment}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Priority:</strong> {result.study_priority}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Misconceptions */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Detected Misconceptions ({result.misconceptions.length})</h2>
            {result.misconceptions.map((m, idx) => (
              <Card key={idx} className={`border-2 ${severityStyles[m.severity]} transition-all`}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{severityIcons[m.severity]}</span>
                    {m.title}
                    <span className="ml-auto text-xs font-normal text-muted-foreground capitalize">
                      {m.severity}
                    </span>
                  </CardTitle>
                </CardHeader>
                <AnimatePresence>
                  {expandedIdx === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="pt-0 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-medium text-red-600 mb-1">❌ What you think:</p>
                            <p className="text-sm">{m.what_student_thinks}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-xs font-medium text-green-600 mb-1">✅ The truth:</p>
                            <p className="text-sm">{m.correct_concept}</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Why it's wrong:</p>
                          <p className="text-sm">{m.why_its_wrong}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">💡 Analogy to fix it:</p>
                          <p className="text-sm">{m.analogy}</p>
                        </div>

                        {/* Practice Question */}
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4" /> Practice Question
                          </p>
                          <p className="text-sm mb-3">{m.practice_question}</p>
                          <Textarea
                            placeholder="Type your answer..."
                            value={practiceAnswers[idx] || ""}
                            onChange={(e) => setPracticeAnswers({ ...practiceAnswers, [idx]: e.target.value })}
                            className="mb-2"
                            disabled={practiceRevealed[idx]}
                          />
                          {practiceRevealed[idx] ? (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-xs font-medium text-green-600 mb-1">Answer:</p>
                              <p className="text-sm">{m.practice_answer}</p>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPracticeRevealed({ ...practiceRevealed, [idx]: true })}
                            >
                              Show Answer
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={reset} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" /> Analyze Different Answers
          </Button>
        </motion.div>
      )}

      {/* Saved Corrections */}
      {savedCorrections && savedCorrections.length > 0 && !result && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Your Correction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedCorrections.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{c.misconception}</p>
                    <p className="text-xs text-muted-foreground">{c.topic} • {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <CheckCircle2 className={`h-4 w-4 ${c.resolved ? "text-green-500" : "text-muted-foreground/30"}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
