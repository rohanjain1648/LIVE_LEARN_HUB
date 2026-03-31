import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Upload, Loader2, Save, ChevronLeft, ChevronRight, AudioLines } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

type FlashcardResult = {
  transcript: string;
  title: string;
  cards: { front: string; back: string }[];
};

export default function VoiceToFlashcardsPage() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<FlashcardResult | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        processAudio(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to record.", variant: "destructive" });
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Invalid file", description: "Please upload an audio file.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }
    processAudio(file);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("count", "10");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-flashcards`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Processing failed");
      }

      const data = await response.json();
      if (!data.cards || data.cards.length === 0) {
        throw new Error("No flashcards could be generated from this audio.");
      }
      setResult(data);
      setPreviewIndex(0);
      toast({ title: "Flashcards generated!", description: `${data.cards.length} cards created from your audio.` });
    } catch (e: any) {
      toast({ title: "Processing failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveDeck = async () => {
    if (!result || !user) return;
    setIsSaving(true);
    try {
      const { data: deck, error: deckError } = await supabase
        .from("flashcard_decks")
        .insert({ title: result.title, description: "Generated from audio recording", user_id: user.id, card_count: result.cards.length })
        .select()
        .single();

      if (deckError) throw deckError;

      const cardsToInsert = result.cards.map((c) => ({
        front: c.front,
        back: c.back,
        deck_id: deck.id,
        user_id: user.id,
      }));

      const { error: cardsError } = await supabase.from("flashcards").insert(cardsToInsert);
      if (cardsError) throw cardsError;

      toast({ title: "Deck saved!", description: `"${result.title}" with ${result.cards.length} cards saved to your flashcards.` });
      setResult(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <AudioLines className="h-8 w-8 text-primary" /> Voice to Flashcards
        </h1>
        <p className="text-muted-foreground mt-1">
          Record a lecture or upload audio — AI transcribes it and generates a flashcard deck from key concepts.
        </p>
      </motion.div>

      {/* Recording / Upload Section */}
      {!result && !isProcessing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Record Audio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {isRecording && (
                <div className="text-center space-y-2">
                  <div className="text-4xl font-mono font-bold text-destructive">{formatTime(recordingTime)}</div>
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Recording...
                  </div>
                </div>
              )}
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                className="gap-2"
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full gap-2">
                <Upload className="h-4 w-4" /> Upload Audio File
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">MP3, WAV, M4A, WebM — max 20MB</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Processing */}
      {isProcessing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-border/50">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Processing your audio...</p>
                <p className="text-sm text-muted-foreground mt-1">Transcribing and generating flashcards — this may take a minute.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Transcript */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground max-h-40 overflow-y-auto leading-relaxed">{result.transcript}</p>
            </CardContent>
          </Card>

          {/* Card Preview */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{result.title}</CardTitle>
              <span className="text-sm text-muted-foreground">{result.cards.length} cards</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={((previewIndex + 1) / result.cards.length) * 100} className="h-2" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={previewIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-[140px] flex flex-col justify-center p-4 rounded-lg bg-muted"
                >
                  <p className="text-xs text-muted-foreground mb-2">Card {previewIndex + 1} of {result.cards.length}</p>
                  <p className="font-medium mb-3">{result.cards[previewIndex].front}</p>
                  <p className="text-sm text-muted-foreground border-t border-border pt-3">{result.cards[previewIndex].back}</p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))} disabled={previewIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewIndex((i) => Math.min(result.cards.length - 1, i + 1))} disabled={previewIndex === result.cards.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={saveDeck} disabled={isSaving} className="flex-1 gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Deck
            </Button>
            <Button variant="outline" onClick={() => setResult(null)} className="gap-2">
              <Mic className="h-4 w-4" /> New Recording
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
