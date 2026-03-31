import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Send, Star, Loader2, ChevronLeft, Eye, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function CodeReviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("browse");
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [scores, setScores] = useState({ readability: 3, correctness: 3, efficiency: 3 });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { data: submissions } = useQuery({
    queryKey: ["code_submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("code_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: mySubmissions } = useQuery({
    queryKey: ["my_submissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("code_submissions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: reviews } = useQuery({
    queryKey: ["code_reviews", reviewingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("code_reviews")
        .select("*")
        .eq("submission_id", reviewingId!);
      return data || [];
    },
    enabled: !!reviewingId,
  });

  const handleSubmit = async () => {
    if (!user || !title || !problem || !code) return;
    setSubmitting(true);
    try {
      // AI auto-grade
      const { data: aiData, error: aiError } = await supabase.functions.invoke("code-review", {
        body: { action: "grade-code", code, language, problemDescription: problem },
      });

      let aiScore = null;
      let aiFeedback = null;
      if (!aiError && aiData?.content) {
        try {
          const parsed = JSON.parse(aiData.content.match(/\{[\s\S]*\}/)?.[0] || aiData.content);
          aiScore = parsed.score;
          aiFeedback = parsed.feedback;
        } catch { aiFeedback = aiData.content; }
      }

      await supabase.from("code_submissions").insert({
        user_id: user.id,
        title,
        problem_description: problem,
        code,
        language,
        ai_score: aiScore,
        ai_feedback: aiFeedback,
        status: "open",
      });

      queryClient.invalidateQueries({ queryKey: ["code_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["my_submissions"] });
      setTitle(""); setProblem(""); setCode("");
      setTab("browse");
      toast({ title: "Code submitted & AI graded!" });
    } catch (e: any) {
      toast({ title: "Submission failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (submissionId: string) => {
    if (!user || !reviewFeedback) return;
    setReviewSubmitting(true);
    try {
      // Grade review quality
      const { data: qualityData } = await supabase.functions.invoke("code-review", {
        body: { action: "grade-review", review: reviewFeedback },
      });

      let qualityScore = 3;
      let xpEarned = 15;
      try {
        const parsed = JSON.parse(qualityData?.content?.match(/\{[\s\S]*\}/)?.[0] || "{}");
        qualityScore = parsed.quality_score || 3;
        xpEarned = qualityScore * 5;
      } catch { }

      await supabase.from("code_reviews").insert({
        submission_id: submissionId,
        reviewer_id: user.id,
        readability_score: scores.readability,
        correctness_score: scores.correctness,
        efficiency_score: scores.efficiency,
        feedback: reviewFeedback,
        review_quality_score: qualityScore,
        xp_earned: xpEarned,
      });

      // Award XP
      const { data: progress } = await supabase.from("user_progress").select("xp").eq("user_id", user.id).single();
      if (progress) {
        await supabase.from("user_progress").update({ xp: progress.xp + xpEarned }).eq("user_id", user.id);
      }

      queryClient.invalidateQueries({ queryKey: ["code_reviews"] });
      setReviewFeedback("");
      setScores({ readability: 3, correctness: 3, efficiency: 3 });
      toast({ title: `Review submitted! +${xpEarned} XP` });
    } catch {
      toast({ title: "Review failed", variant: "destructive" });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const viewSubmission = submissions?.find((s: any) => s.id === reviewingId);

  if (reviewingId && viewSubmission) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setReviewingId(null)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">{viewSubmission.title}</CardTitle>
              {viewSubmission.ai_score != null && (
                <Badge variant="secondary">AI Score: {viewSubmission.ai_score}/100</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{viewSubmission.problem_description}</p>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono">
              {viewSubmission.code}
            </pre>
            {viewSubmission.ai_feedback && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">AI Feedback</p>
                <p className="text-sm">{viewSubmission.ai_feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Reviews */}
        {reviews && reviews.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display font-bold">Peer Reviews ({reviews.length})</h3>
            {reviews.map((r: any) => (
              <Card key={r.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                    <span>Readability: {r.readability_score}/5</span>
                    <span>Correctness: {r.correctness_score}/5</span>
                    <span>Efficiency: {r.efficiency_score}/5</span>
                    {r.review_quality_score && (
                      <span className="ml-auto text-primary">Review quality: {r.review_quality_score}/5 ⭐</span>
                    )}
                  </div>
                  <p className="text-sm">{r.feedback}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Write Review */}
        {viewSubmission.user_id !== user?.id && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-lg">Write Your Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {(["readability", "correctness", "efficiency"] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground capitalize">{key}</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setScores((p) => ({ ...p, [key]: n }))}
                          className="transition-colors"
                        >
                          <Star className={`h-5 w-5 ${n <= scores[key] ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Textarea
                placeholder="Detailed, constructive feedback earns more XP..."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                rows={4}
              />
              <Button onClick={() => handleReview(reviewingId)} disabled={reviewSubmitting || !reviewFeedback} className="gap-2">
                {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Review
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Code2 className="h-8 w-8 text-primary" /> Code Review Arena
        </h1>
        <p className="text-muted-foreground mt-1">Submit code, get AI-graded, then peer-reviewed. Review others to earn XP!</p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="submit">Submit Code</TabsTrigger>
          <TabsTrigger value="mine">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4 mt-4">
          {!submissions || submissions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                No submissions yet. Be the first!
              </CardContent>
            </Card>
          ) : (
            submissions.filter((s: any) => s.user_id !== user?.id).map((s: any) => (
              <Card key={s.id} className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setReviewingId(s.id)}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.language} • {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.ai_score != null && <Badge variant="secondary">AI: {s.ai_score}</Badge>}
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="submit" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              <Input placeholder="Title (e.g., 'Binary Search Implementation')" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Problem description..." value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["javascript", "typescript", "python", "java", "c++", "rust", "go"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Paste your code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <Button onClick={handleSubmit} disabled={submitting || !title || !code} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit & AI Grade
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine" className="space-y-4 mt-4">
          {!mySubmissions || mySubmissions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                No submissions yet.
              </CardContent>
            </Card>
          ) : (
            mySubmissions.map((s: any) => (
              <Card key={s.id} className="border-border/50 cursor-pointer" onClick={() => setReviewingId(s.id)}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.language} • {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.ai_score != null && <Badge variant="secondary">AI: {s.ai_score}</Badge>}
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
