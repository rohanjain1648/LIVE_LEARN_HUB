import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Sparkles, RotateCcw, ArrowLeft, ArrowRight, Check, X,
  Brain, Layers, Zap, Clock, Trash2, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Leitner box intervals in hours
const BOX_INTERVALS = [0, 1, 4, 24, 72, 168]; // box 1-5 + initial

interface Deck {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
  last_reviewed_at: string | null;
  created_at: string;
}

interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  box: number;
  next_review_at: string;
  review_count: number;
  correct_count: number;
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const { data: decks, isLoading } = useQuery({
    queryKey: ["flashcard_decks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("flashcard_decks")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as Deck[];
    },
    enabled: !!user,
  });

  if (reviewing && selectedDeck) {
    return (
      <ReviewMode
        deck={selectedDeck}
        user={user}
        onBack={() => { setReviewing(false); queryClient.invalidateQueries({ queryKey: ["flashcard_decks"] }); }}
      />
    );
  }

  if (selectedDeck) {
    return (
      <DeckView
        deck={selectedDeck}
        user={user}
        onBack={() => { setSelectedDeck(null); queryClient.invalidateQueries({ queryKey: ["flashcard_decks"] }); }}
        onReview={() => setReviewing(true)}
        toast={toast}
      />
    );
  }

  return (
    <DeckList
      decks={decks || []}
      loading={isLoading}
      user={user}
      onSelectDeck={setSelectedDeck}
      toast={toast}
      queryClient={queryClient}
    />
  );
}

/* ========== DECK LIST ========== */
function DeckList({ decks, loading, user, onSelectDeck, toast, queryClient }: any) {
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [generating, setGenerating] = useState(false);

  const createDeck = async () => {
    if (!title.trim() || !user) return;
    await supabase.from("flashcard_decks").insert({ user_id: user.id, title, description: desc || null });
    queryClient.invalidateQueries({ queryKey: ["flashcard_decks"] });
    setTitle(""); setDesc(""); setCreateOpen(false);
    toast({ title: "Deck created!" });
  };

  const generateWithAI = async () => {
    if (!aiText.trim() || !aiTitle.trim() || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { text: aiText, count: 10 },
      });
      if (error) throw error;
      if (!data?.cards?.length) throw new Error("No cards generated");

      // Create deck
      const { data: deck } = await supabase.from("flashcard_decks")
        .insert({ user_id: user.id, title: aiTitle, description: "AI-generated", card_count: data.cards.length })
        .select().single();

      if (deck) {
        const cards = data.cards.map((c: any) => ({
          deck_id: deck.id, user_id: user.id, front: c.front, back: c.back,
        }));
        await supabase.from("flashcards").insert(cards);
      }

      queryClient.invalidateQueries({ queryKey: ["flashcard_decks"] });
      setAiText(""); setAiTitle(""); setAiOpen(false);
      toast({ title: "🎉 Deck generated!", description: `${data.cards.length} flashcards created` });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("flashcard_decks").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["flashcard_decks"] });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold">Flashcards</h1>
        <p className="mt-1 text-muted-foreground">Master anything with spaced repetition and AI-generated cards.</p>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> New Deck</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Deck</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology Chapter 3" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's in this deck?" />
              </div>
              <Button onClick={createDeck} disabled={!title.trim()} className="w-full bg-gradient-primary text-primary-foreground">Create</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent text-accent-foreground hover:opacity-90">
              <Sparkles className="h-4 w-4 mr-2" /> AI Generate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Generate with AI</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Deck Title</Label>
                <Input value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} placeholder="e.g. Photosynthesis" />
              </div>
              <div className="space-y-2">
                <Label>Paste your study notes</Label>
                <Textarea value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Paste text, notes, or a topic..." rows={8} />
              </div>
              <Button onClick={generateWithAI} disabled={!aiText.trim() || !aiTitle.trim() || generating} className="w-full bg-gradient-accent text-accent-foreground">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generating ? "Generating..." : "Generate Flashcards"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading decks...</div>
      ) : decks.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No decks yet. Create one or let AI generate flashcards!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((d: Deck) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors group"
                onClick={() => onSelectDeck(d)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold truncate">{d.title}</h3>
                      {d.description && <p className="text-xs text-muted-foreground mt-1 truncate">{d.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => deleteDeck(d.id, e)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <Badge variant="secondary" className="text-xs"><Layers className="h-3 w-3 mr-1" /> {d.card_count} cards</Badge>
                    {d.last_reviewed_at && (
                      <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" /> {new Date(d.last_reviewed_at).toLocaleDateString()}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== DECK VIEW ========== */
function DeckView({ deck, user, onBack, onReview, toast }: any) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const { data: cards } = useQuery({
    queryKey: ["flashcards", deck.id],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("*").eq("deck_id", deck.id).order("created_at");
      return (data || []) as Flashcard[];
    },
  });

  const dueCards = (cards || []).filter((c) => new Date(c.next_review_at) <= new Date());

  const addCard = async () => {
    if (!front.trim() || !back.trim()) return;
    await supabase.from("flashcards").insert({ deck_id: deck.id, user_id: user.id, front, back });
    await supabase.from("flashcard_decks").update({ card_count: (cards?.length || 0) + 1 }).eq("id", deck.id);
    queryClient.invalidateQueries({ queryKey: ["flashcards", deck.id] });
    setFront(""); setBack(""); setAddOpen(false);
  };

  const deleteCard = async (id: string) => {
    await supabase.from("flashcards").delete().eq("id", id);
    await supabase.from("flashcard_decks").update({ card_count: Math.max(0, (cards?.length || 1) - 1) }).eq("id", deck.id);
    queryClient.invalidateQueries({ queryKey: ["flashcards", deck.id] });
  };

  // Box distribution
  const boxCounts = [0, 0, 0, 0, 0, 0];
  (cards || []).forEach((c) => { if (c.box >= 1 && c.box <= 5) boxCounts[c.box]++; });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{deck.title}</h1>
          <p className="text-sm text-muted-foreground">{cards?.length || 0} cards • {dueCards.length} due for review</p>
        </div>
        <Button onClick={onReview} disabled={dueCards.length === 0} className="bg-gradient-primary text-primary-foreground">
          <Brain className="h-4 w-4 mr-2" /> Review ({dueCards.length})
        </Button>
      </div>

      {/* Leitner Box Visualization */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-display text-base">Leitner Boxes</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((box) => (
              <div key={box} className="flex-1 text-center">
                <div className={`h-16 rounded-lg flex items-center justify-center text-lg font-bold ${
                  box === 1 ? "bg-destructive/10 text-destructive" :
                  box === 2 ? "bg-warning/10 text-warning" :
                  box === 3 ? "bg-accent/10 text-accent" :
                  box === 4 ? "bg-primary/10 text-primary" :
                  "bg-success/10 text-success"
                }`}>
                  {boxCounts[box]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Box {box}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Card + Card List */}
      <div className="flex gap-3">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Flashcard</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Front (Question)</Label><Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="What is...?" rows={3} /></div>
              <div className="space-y-2"><Label>Back (Answer)</Label><Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="The answer is..." rows={3} /></div>
              <Button onClick={addCard} disabled={!front.trim() || !back.trim()} className="w-full bg-gradient-primary text-primary-foreground">Add Card</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!cards || cards.length === 0) ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No cards yet. Add some or use AI Generate from the deck list!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.front}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.back}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">Box {c.box}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCard(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== REVIEW MODE ========== */
function ReviewMode({ deck, user, onBack }: { deck: Deck; user: any; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 });
  const [done, setDone] = useState(false);

  const { data: dueCards } = useQuery({
    queryKey: ["flashcards_due", deck.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("flashcards")
        .select("*")
        .eq("deck_id", deck.id)
        .lte("next_review_at", new Date().toISOString())
        .order("box", { ascending: true });
      return (data || []) as Flashcard[];
    },
  });

  const cards = dueCards || [];
  const current = cards[currentIndex];
  const total = cards.length;
  const progress = total > 0 ? ((currentIndex + (done ? 1 : 0)) / total) * 100 : 0;

  const answerCard = async (correct: boolean) => {
    if (!current || !user) return;

    const newBox = correct ? Math.min(current.box + 1, 5) : 1;
    const hoursToAdd = BOX_INTERVALS[newBox] || 1;
    const nextReview = new Date(Date.now() + hoursToAdd * 3600000).toISOString();

    await supabase.from("flashcards").update({
      box: newBox,
      next_review_at: nextReview,
      review_count: current.review_count + 1,
      correct_count: current.correct_count + (correct ? 1 : 0),
    }).eq("id", current.id);

    setResults((r) => ({
      correct: r.correct + (correct ? 1 : 0),
      incorrect: r.incorrect + (correct ? 0 : 1),
    }));

    setFlipped(false);
    if (currentIndex + 1 >= total) {
      // Award XP
      const xpEarned = (results.correct + (correct ? 1 : 0)) * 10;
      const { data: prog } = await supabase.from("user_progress").select("xp").eq("user_id", user.id).single();
      if (prog) {
        await supabase.from("user_progress").update({
          xp: prog.xp + xpEarned,
          last_activity_date: new Date().toISOString().split("T")[0],
        }).eq("user_id", user.id);
      }
      await supabase.from("flashcard_decks").update({ last_reviewed_at: new Date().toISOString() }).eq("id", deck.id);

      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
      setDone(true);
      toast({ title: "🎉 Review complete!", description: `+${xpEarned} XP earned` });
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!cards.length) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto text-center space-y-4">
        <h2 className="font-display text-2xl font-bold">No cards due!</h2>
        <p className="text-muted-foreground">All caught up. Come back later for more review.</p>
        <Button onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Deck</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto text-center space-y-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h2 className="font-display text-3xl font-bold">Review Complete! 🎉</h2>
          <div className="flex justify-center gap-8 mt-6">
            <div className="text-center">
              <p className="font-display text-4xl font-bold text-success">{results.correct}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="text-center">
              <p className="font-display text-4xl font-bold text-destructive">{results.incorrect}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4">+{results.correct * 10} XP earned</p>
          <Button onClick={onBack} className="mt-6"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Deck</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">{deck.title}</h2>
          <p className="text-xs text-muted-foreground">{currentIndex + 1} / {total}</p>
        </div>
        <Badge variant="secondary">Box {current?.box}</Badge>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Card */}
      <motion.div
        key={current?.id}
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex justify-center"
      >
        <Card
          className="border-border/50 w-full max-w-md cursor-pointer min-h-[280px] flex items-center justify-center"
          onClick={() => setFlipped(!flipped)}
        >
          <CardContent className="p-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={flipped ? "back" : "front"}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {!flipped ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">QUESTION</p>
                    <p className="font-display text-xl font-semibold">{current?.front}</p>
                    <p className="text-xs text-muted-foreground mt-6">Tap to reveal</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">ANSWER</p>
                    <p className="text-lg">{current?.back}</p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {flipped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-4">
          <Button size="lg" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => answerCard(false)}>
            <X className="h-5 w-5 mr-2" /> Incorrect
          </Button>
          <Button size="lg" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => answerCard(true)}>
            <Check className="h-5 w-5 mr-2" /> Correct
          </Button>
        </motion.div>
      )}
    </div>
  );
}
