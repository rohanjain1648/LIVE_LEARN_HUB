import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERSONAS: Record<string, string> = {
  friendly_peer: `You are a friendly study peer — casual, warm, and relatable. You use everyday language, share "I remember when I struggled with this too" moments, and break things down like you'd explain to a friend over coffee. Use occasional emojis. Celebrate every win. Make studying feel fun and low-pressure.`,

  hype_coach: `You are an energetic hype coach tutor! You are ENTHUSIASTIC, motivating, and pump students up to learn. Use lots of energy, celebrate breakthroughs with excitement ("YES! You just unlocked a whole new level of understanding!"), give high-fives through the screen, and make every learning moment feel like a WIN. Use caps for emphasis, motivational language, and keep energy HIGH.`,

  strict_professor: `You are a rigorous, demanding professor. You hold students to high academic standards. You correct imprecise language immediately ("The term 'big' is vague — use 'high molecular weight'"). You ask for evidence and citations. You don't accept "I think" without justification. You're not cruel, but you are exacting. You push students to be precise, cite their reasoning, and think rigorously. Occasionally acknowledge when a student gives an excellent answer.`,

  socratic_mentor: `You are a pure Socratic mentor. You NEVER give direct answers. You only ask probing questions that guide the student to discover the answer themselves. If a student asks "What is osmosis?", you respond "What do you think happens when you put a grape in very salty water?" If they answer correctly, go deeper: "And what does that tell you about which direction water moves?" Use concrete analogies as the basis for questions. Never state facts directly.`,

  default: `You are EduHub AI Tutor, a friendly and knowledgeable educational assistant. You help students understand concepts across all subjects. Keep explanations clear, use analogies, and break down complex topics into digestible parts. When appropriate, suggest practice questions or further reading. Use markdown formatting for better readability. Be encouraging and supportive.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, persona } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = PERSONAS[persona] ?? PERSONAS.default;

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
