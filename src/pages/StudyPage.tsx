import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, FileText, Brain, Sparkles, Upload, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

const tools = [
  { icon: Brain, title: "Generate Quiz", desc: "Create MCQs from your notes", gradient: "bg-gradient-primary" },
  { icon: FileText, title: "Flashcards", desc: "AI-generated study cards", gradient: "bg-gradient-accent" },
  { icon: Sparkles, title: "Summarize", desc: "Get key points instantly", gradient: "bg-gradient-warm" },
  { icon: Upload, title: "Upload PDF", desc: "Convert documents to study tools", gradient: "bg-gradient-primary" },
];

export default function StudyPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const generateQuiz = async () => {
    if (!content.trim()) {
      toast({ title: "No content", description: "Paste some study material first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setShowResults(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { content: content.trim(), count: 5 },
      });
      if (error) throw error;
      if (data?.questions) {
        setQuestions(data.questions);
      } else {
        throw new Error("No questions returned");
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Generation failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (qIdx: number, optIdx: number) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const checkAnswers = () => setShowResults(true);

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_answer ? 1 : 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold">Study Tools 📚</h1>
        <p className="mt-1 text-muted-foreground">AI-powered tools to supercharge your learning.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((t) => (
          <Card key={t.title} className="border-border/50 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1">
            <CardContent className="p-5 text-center space-y-3">
              <div className={`mx-auto h-11 w-11 rounded-xl ${t.gradient} flex items-center justify-center`}>
                <t.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Paste Your Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your study material, lecture notes, or any text here... The AI will generate quizzes from it."
            className="min-h-[200px] resize-none"
          />
          <div className="flex gap-3">
            <Button
              onClick={generateQuiz}
              disabled={loading || !content.trim()}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              Generate Quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Generated Quiz</h2>
            {showResults && (
              <span className="font-display text-lg font-bold text-primary">
                Score: {score}/{questions.length}
              </span>
            )}
          </div>
          {questions.map((q, qIdx) => (
            <Card key={qIdx} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <p className="font-medium">{qIdx + 1}. {q.question}</p>
                <div className="grid gap-2">
                  {q.options.map((opt, oIdx) => {
                    const selected = answers[qIdx] === oIdx;
                    const isCorrect = q.correct_answer === oIdx;
                    let cls = "border-border/50 hover:bg-muted/50 cursor-pointer";
                    if (showResults && isCorrect) cls = "border-success bg-success/10";
                    else if (showResults && selected && !isCorrect) cls = "border-destructive bg-destructive/10";
                    else if (selected) cls = "border-primary bg-primary/10";

                    return (
                      <button
                        key={oIdx}
                        onClick={() => selectAnswer(qIdx, oIdx)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all ${cls}`}
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {showResults && isCorrect && <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />}
                        {showResults && selected && !isCorrect && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {showResults && q.explanation && (
                  <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                    💡 {q.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {!showResults && Object.keys(answers).length === questions.length && (
            <Button onClick={checkAnswers} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Check Answers
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
