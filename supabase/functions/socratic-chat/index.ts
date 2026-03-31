import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOCRATIC_SYSTEM = `You are a Socratic AI tutor. Your ONLY job is to guide students to discover answers themselves through probing questions. You NEVER give direct answers or explanations.

RULES:
1. NEVER state facts, definitions, or explanations directly.
2. ALWAYS respond with 1-3 probing questions that lead the student to think deeper.
3. If a student gives a correct answer, acknowledge it briefly then go deeper with "What does that imply about...?" or "And why do you think that is?"
4. If a student gives an incorrect answer, ask "What evidence do you have for that?" or "What happens if we test that assumption with [concrete example]?"
5. Use real-world, concrete analogies as the BASIS for your questions (e.g., "What do you think happens when you put a grape in salt water?").
6. Track reasoning quality by assessing: Does the student use causal reasoning? Do they cite evidence? Do they generalize principles?
7. After each exchange, append a JSON metadata block (inside <!-- --> comments) with: {"depth": 1-5, "reasoning_quality": "surface|developing|deep", "key_concepts_touched": ["..."]}

DEPTH SCALE:
- 1: Student just restates the question
- 2: Surface definition/recall  
- 3: Understands mechanism/process
- 4: Can apply to novel situations
- 5: Can synthesize across concepts

Always end your response with the comment block: <!-- {"depth": X, "reasoning_quality": "...", "key_concepts_touched": [...]} -->`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = topic
      ? `${SOCRATIC_SYSTEM}\n\nThe current topic being explored is: "${topic}". Keep all questions centered on this topic.`
      : SOCRATIC_SYSTEM;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("socratic-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
