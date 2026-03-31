import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, BookOpen, Zap, CheckCircle2, XCircle, Trash2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function ScreenshotPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState<"explain" | "quiz" | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["screenshot_explanations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("screenshot_explanations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const handleFileSelect = useCallback(async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to storage
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("screenshots").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setExplanation(null);
    setQuiz(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const analyze = async (mode: "explain" | "quiz") => {
    if (!imageUrl || !user) return;
    setLoading(mode);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-screenshot", {
        body: { imageUrl, mode },
      });
      if (error) throw error;

      if (mode === "explain") {
        setExplanation(data.content);
        // Save to DB
        await supabase.from("screenshot_explanations").insert({
          user_id: user.id,
          image_url: imageUrl,
          explanation: data.content,
          title: data.content.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 80) || "Screenshot Analysis",
        });
        queryClient.invalidateQueries({ queryKey: ["screenshot_explanations"] });
      } else {
        try {
          // Try to parse the quiz JSON
          let parsed = JSON.parse(data.content);
          if (!Array.isArray(parsed)) parsed = [parsed];
          setQuiz(parsed);
          setQuizAnswers({});
          setQuizSubmitted(false);
        } catch {
          // If parsing fails, try to extract JSON from markdown
          const match = data.content.match(/\[[\s\S]*\]/);
          if (match) {
            setQuiz(JSON.parse(match[0]));
            setQuizAnswers({});
            setQuizSubmitted(false);
          } else {
            toast({ title: "Could not generate quiz", description: "Try again", variant: "destructive" });
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const quizScore = quiz
    ? Object.entries(quizAnswers).filter(([i, a]) => quiz[Number(i)]?.correct === a).length
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Camera className="h-8 w-8 text-primary" /> Screenshot to Explanation
        </h1>
        <p className="text-muted-foreground mt-1">Upload any image — textbook, whiteboard, notes, code — and AI will explain it instantly.</p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain" />
          ) : (
            <div className="space-y-3">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-lg font-medium">Drop an image here or click to upload</p>
              <p className="text-sm text-muted-foreground">Supports photos, screenshots, handwritten notes, graphs, code</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      </motion.div>

      {/* Action Buttons */}
      {imageUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 flex-wrap">
          <Button onClick={() => analyze("explain")} disabled={!!loading} className="gap-2">
            {loading === "explain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            Explain This
          </Button>
          <Button onClick={() => analyze("quiz")} disabled={!!loading} variant="secondary" className="gap-2">
            {loading === "quiz" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Generate Quiz
          </Button>
          <Button
            variant="outline"
            onClick={() => { setPreview(null); setImageUrl(null); setExplanation(null); setQuiz(null); }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </motion.div>
      )}

      {/* Explanation */}
      <AnimatePresence>
        {explanation && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-lg">AI Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {explanation}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz */}
      <AnimatePresence>
        {quiz && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" /> Quick Quiz
                  {quizSubmitted && (
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      Score: {quizScore}/{quiz.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {quiz.map((q, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="font-medium text-sm">{qi + 1}. {q.question}</p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oi) => {
                        const selected = quizAnswers[qi] === oi;
                        const isCorrect = q.correct === oi;
                        
                        let extra = "";
                        if (quizSubmitted) {
                          if (isCorrect) extra = "border-green-500 bg-green-500/10";
                          else if (selected && !isCorrect) extra = "border-destructive bg-destructive/10";
                        } else if (selected) {
                          extra = "border-primary bg-primary/10";
                        }
                        return (
                          <button
                            key={oi}
                            onClick={() => !quizSubmitted && setQuizAnswers((p) => ({ ...p, [qi]: oi }))}
                            className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${extra} ${!quizSubmitted ? "hover:bg-muted/50 cursor-pointer" : ""}`}
                            disabled={quizSubmitted}
                          >
                            <span className="flex items-center gap-2">
                              {quizSubmitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                              {quizSubmitted && selected && !isCorrect && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && q.explanation && (
                      <p className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-primary/30">{q.explanation}</p>
                    )}
                  </div>
                ))}
                {!quizSubmitted ? (
                  <Button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={Object.keys(quizAnswers).length < quiz.length}
                    className="w-full"
                  >
                    Submit Answers
                  </Button>
                ) : (
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="font-display text-xl font-bold">
                      {quizScore === quiz.length ? "🎉 Perfect!" : quizScore >= quiz.length * 0.6 ? "👏 Good job!" : "📚 Keep studying!"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{quizScore} out of {quiz.length} correct</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history && history.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((h: any) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setPreview(h.image_url);
                    setImageUrl(h.image_url);
                    setExplanation(h.explanation);
                    setQuiz(null);
                  }}
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{h.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
