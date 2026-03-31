import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Send, Brain, User, Sparkles, Loader2, RotateCcw, Target, TrendingUp, Save } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const SOCRATIC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socratic-chat`;

interface DepthMetadata {
  depth: number;
  reasoning_quality: "surface" | "developing" | "deep";
  key_concepts_touched: string[];
}

function parseMetadata(content: string): { text: string; metadata?: DepthMetadata } {
  const match = content.match(/<!--\s*(\{.*?\})\s*-->/s);
  if (match) {
    try {
      const metadata = JSON.parse(match[1]) as DepthMetadata;
      return { text: content.replace(match[0], "").trim(), metadata };
    } catch {
      return { text: content, metadata: undefined };
    }
  }
  return { text: content, metadata: undefined };
}

const depthLabels = ["", "Restating", "Surface recall", "Understanding", "Applying", "Synthesizing"];
const depthColors = ["", "bg-muted", "bg-yellow-500/20 text-yellow-600", "bg-blue-500/20 text-blue-600", "bg-green-500/20 text-green-600", "bg-purple-500/20 text-purple-600"];

const suggestedTopics = [
  "What is osmosis?",
  "Explain Newton's third law",
  "Why does the sky appear blue?",
  "How does photosynthesis work?",
];

export default function SocraticPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [depthHistory, setDepthHistory] = useState<DepthMetadata[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = useQuery({
    queryKey: ["socratic_sessions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("socratic_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startSession = (t: string) => {
    const topicText = t.trim();
    if (!topicText) return;
    setActiveTopic(topicText);
    setMessages([]);
    setDepthHistory([]);
    sendMessage(topicText, topicText);
  };

  const sendMessage = async (text: string, sessionTopic?: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > allMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev.slice(0, allMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(SOCRATIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          topic: sessionTopic || activeTopic,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Parse metadata from final response
      const { metadata } = parseMetadata(assistantSoFar);
      if (metadata) {
        setDepthHistory((prev) => [...prev, metadata]);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "AI Error",
        description: e instanceof Error ? e.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async () => {
    if (!user || !activeTopic || messages.length < 2) return;
    const maxDepth = depthHistory.length ? Math.max(...depthHistory.map((d) => d.depth)) : 0;
    await supabase.from("socratic_sessions").insert({
      user_id: user.id,
      topic: activeTopic,
      messages: messages,
      reasoning_depth: maxDepth,
    });
    queryClient.invalidateQueries({ queryKey: ["socratic_sessions"] });
    toast({ title: "Session saved!" });
  };

  const loadSession = (session: any) => {
    setActiveTopic(session.topic);
    setMessages(session.messages || []);
    setDepthHistory([]);
  };

  const currentDepth = depthHistory.length ? depthHistory[depthHistory.length - 1] : null;
  const maxDepth = depthHistory.length ? Math.max(...depthHistory.map((d) => d.depth)) : 0;

  // Topic selection
  if (!activeTopic) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" /> Socratic Debate Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover answers through questions, not lectures. The AI guides your thinking — you do the reasoning.
          </p>
        </motion.div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Start a New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What concept do you want to explore?"
                onKeyDown={(e) => e.key === "Enter" && startSession(topic)}
              />
              <Button onClick={() => startSession(topic)} disabled={!topic.trim()}>
                <Sparkles className="mr-2 h-4 w-4" /> Begin
              </Button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Or try these:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((t) => (
                  <Button key={t} variant="outline" size="sm" onClick={() => startSession(t)}>
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {sessions && sessions.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Previous Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((s: any) => (
                  <div
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{s.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        Depth reached: {s.reasoning_depth}/5 • {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${depthColors[s.reasoning_depth] || "bg-muted"}`}>
                      {depthLabels[s.reasoning_depth] || "Unknown"}
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

  // Active session
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {activeTopic}
            </h1>
            <p className="text-xs text-muted-foreground">Socratic Mode • Think before answering</p>
          </div>
          <div className="flex items-center gap-2">
            {currentDepth && (
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${depthColors[currentDepth.depth]}`}>
                <Target className="h-3.5 w-3.5" />
                Depth {currentDepth.depth}/5 • {depthLabels[currentDepth.depth]}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={saveSession}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setActiveTopic(null)}>
              <RotateCcw className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
        </div>
        {depthHistory.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {depthHistory.map((d, i) => (
                <div
                  key={i}
                  className={`w-6 h-2 rounded ${depthColors[d.depth]}`}
                  title={`Turn ${i + 1}: Depth ${d.depth}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-2">Max: {maxDepth}/5</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => {
          const { text, metadata } = parseMetadata(msg.content);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                ) : (
                  text
                )}
                {metadata && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                    {metadata.key_concepts_touched?.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-accent-foreground" />
                </div>
              )}
            </motion.div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Think carefully and answer the question..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-2">
          💡 Tip: Take your time. Explain your reasoning, not just your answer.
        </p>
      </div>
    </div>
  );
}
