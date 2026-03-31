import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cardFront, cardBack, userAnswer, command } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt: string;
    let userMessage: string;

    if (command === "score") {
      systemPrompt = `You are a study tutor scoring a flashcard answer. Be encouraging but accurate. Compare the student's spoken answer to the correct answer. Return JSON: {"correct": true/false, "feedback": "brief encouraging feedback", "score": 0-100}. Be lenient with phrasing — focus on whether they understood the concept.`;
      userMessage = `Flashcard question: "${cardFront}"\nCorrect answer: "${cardBack}"\nStudent said: "${userAnswer}"`;
    } else if (command === "explain") {
      systemPrompt = `You are a friendly tutor. The student asked for more explanation about a flashcard topic. Give a clear, conversational explanation (2-3 sentences max, suitable for text-to-speech reading). Be concise and engaging.`;
      userMessage = `Topic: "${cardFront}"\nAnswer: "${cardBack}"\nExplain this more clearly.`;
    } else {
      systemPrompt = `You are a study tutor. Respond helpfully and concisely (1-2 sentences, suitable for voice).`;
      userMessage = command || "Help me study.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits needed" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-study error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
