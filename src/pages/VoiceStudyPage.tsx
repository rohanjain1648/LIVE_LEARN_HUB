import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, SkipForward, Play, Square, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function speak(text: string, onEnd?: () => void) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  if (onEnd) utterance.onend = onEnd;
  speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  speechSynthesis.cancel();
}

export default function VoiceStudyPage() {
  const { user } = useAuth();
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; feedback: string; score: number } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const recognitionRef = useRef<any>(null);

  const { data: decks } = useQuery({
    queryKey: ["flashcard_decks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("flashcard_decks").select("*").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: cards } = useQuery({
    queryKey: ["flashcards", selectedDeck],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("*").eq("deck_id", selectedDeck!);
      return data || [];
    },
    enabled: !!selectedDeck,
  });

  const currentCard = cards?.[currentIndex];

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech recognition not supported", description: "Try Chrome or Edge", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const result = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(result);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const scoreAnswer = async () => {
    if (!currentCard || !transcript) return;
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-study", {
        body: { cardFront: currentCard.front, cardBack: currentCard.back, userAnswer: transcript, command: "score" },
      });
      if (error) throw error;

      let parsed;
      try {
        parsed = JSON.parse(data.content);
      } catch {
        const match = data.content.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { correct: false, feedback: data.content, score: 50 };
      }

      setFeedback(parsed);
      setTotalAnswered((p) => p + 1);
      if (parsed.correct) setCorrectCount((p) => p + 1);

      // Read feedback aloud
      setIsSpeaking(true);
      speak(
        parsed.correct ? `Correct! ${parsed.feedback}` : `Not quite. ${parsed.feedback}. The answer is: ${currentCard.back}`,
        () => setIsSpeaking(false)
      );
    } catch (e: any) {
      toast({ title: "Scoring failed", variant: "destructive" });
    } finally {
      setScoring(false);
    }
  };

  const readCard = () => {
    if (!currentCard) return;
    setIsSpeaking(true);
    setFeedback(null);
    setTranscript("");
    speak(`Question: ${currentCard.front}`, () => setIsSpeaking(false));
  };

  const nextCard = () => {
    if (!cards) return;
    setFeedback(null);
    setTranscript("");
    const next = (currentIndex + 1) % cards.length;
    setCurrentIndex(next);
    setTimeout(() => {
      setIsSpeaking(true);
      speak(`Next question: ${cards[next].front}`, () => setIsSpeaking(false));
    }, 500);
  };

  const startSession = (deckId: string) => {
    setSelectedDeck(deckId);
    setSessionActive(true);
    setCurrentIndex(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setFeedback(null);
    setTranscript("");
    setTimeout(() => {
      speak("Voice study session started. I'll read each flashcard and you answer by speaking. Let's go!", () => {
        // Auto-read first card after intro
      });
    }, 300);
  };

  const endSession = () => {
    stopSpeaking();
    stopListening();
    setSessionActive(false);
    setSelectedDeck(null);
    setFeedback(null);
    setTranscript("");
  };

  // Deck selection
  if (!sessionActive) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Volume2 className="h-8 w-8 text-primary" /> Voice Study
          </h1>
          <p className="text-muted-foreground mt-1">Hands-free flashcard review — AI reads, you speak, AI scores. Perfect for commuting or exercising.</p>
        </motion.div>

        {!decks || decks.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No flashcard decks yet. Create some in Flashcards first!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {decks.map((deck: any) => (
              <Card key={deck.id} className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => startSession(deck.id)}>
                <CardContent className="p-5">
                  <h3 className="font-display font-bold text-lg">{deck.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{deck.card_count} cards</p>
                  <Button size="sm" className="mt-3 gap-2">
                    <Play className="h-3.5 w-3.5" /> Start Voice Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={endSession} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> End Session
        </Button>
        <div className="text-sm text-muted-foreground">
          {totalAnswered > 0 && `${correctCount}/${totalAnswered} correct`}
        </div>
      </div>

      {/* Progress */}
      {cards && (
        <Progress value={((currentIndex + 1) / cards.length) * 100} className="h-2" />
      )}

      {/* Current Card */}
      <AnimatePresence mode="wait">
        {currentCard && (
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-sm text-muted-foreground">
                  Card {currentIndex + 1} of {cards?.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-xl font-medium">{currentCard.front}</p>
                </div>

                {/* Voice Controls */}
                <div className="flex justify-center gap-3">
                  <Button onClick={readCard} disabled={isSpeaking} variant="outline" className="gap-2">
                    {isSpeaking ? <VolumeX className="h-4 w-4 animate-pulse" /> : <Volume2 className="h-4 w-4" />}
                    {isSpeaking ? "Speaking..." : "Read Aloud"}
                  </Button>

                  <Button
                    onClick={isListening ? stopListening : startListening}
                    variant={isListening ? "destructive" : "default"}
                    className="gap-2"
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isListening ? "Stop" : "Answer"}
                  </Button>
                </div>

                {/* Transcript */}
                {transcript && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground mb-1">You said:</p>
                    <p className="font-medium">{transcript}</p>
                    {!feedback && (
                      <Button onClick={scoreAnswer} disabled={scoring} size="sm" className="mt-3 gap-2">
                        {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Score My Answer
                      </Button>
                    )}
                  </motion.div>
                )}

                {/* Feedback */}
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${feedback.correct ? "border-green-500/50 bg-green-500/10" : "border-destructive/50 bg-destructive/10"}`}
                  >
                    <p className="font-medium text-center mb-1">
                      {feedback.correct ? "✅ Correct!" : "❌ Not quite"}
                    </p>
                    <p className="text-sm text-center text-muted-foreground">{feedback.feedback}</p>
                    {!feedback.correct && (
                      <p className="text-sm text-center mt-2 font-medium">Answer: {currentCard.back}</p>
                    )}
                  </motion.div>
                )}

                {/* Next */}
                {feedback && (
                  <div className="flex justify-center">
                    <Button onClick={nextCard} className="gap-2">
                      <SkipForward className="h-4 w-4" /> Next Card
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hands-free tip */}
      <p className="text-xs text-center text-muted-foreground">
        💡 Tip: Say your answer, then tap "Score" — or say "explain that more" for help
      </p>
    </div>
  );
}
