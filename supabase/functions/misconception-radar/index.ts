import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, wrongAnswers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!topic || !wrongAnswers?.length) {
      return new Response(JSON.stringify({ error: "topic and wrongAnswers are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wrongAnswersText = wrongAnswers.map((wa: any, i: number) =>
      `Q${i+1}: "${wa.question}" — Student chose: "${wa.studentAnswer}" (Correct: "${wa.correctAnswer}")`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert educational diagnostician. Analyze a student's wrong answers to identify specific misconceptions, then create targeted correction modules. Be specific — don't just say "wrong", identify the EXACT cognitive error (e.g., "confuses correlation with causation", "thinks osmosis works by concentration of water rather than solute", "applies Newton's 2nd law instead of 3rd"). Each misconception should have a precise correction with analogy.`,
          },
          {
            role: "user",
            content: `Topic: ${topic}\n\nWrong answers:\n${wrongAnswersText}\n\nIdentify misconceptions and create correction modules.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_misconceptions",
              description: "Identify specific misconceptions and create targeted correction modules",
              parameters: {
                type: "object",
                properties: {
                  misconceptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short name for the misconception (e.g., 'Osmosis Direction Confusion')" },
                        what_student_thinks: { type: "string", description: "Precise description of the student's incorrect mental model" },
                        why_its_wrong: { type: "string", description: "Why this specific belief is incorrect" },
                        correct_concept: { type: "string", description: "The accurate concept, explained clearly" },
                        analogy: { type: "string", description: "A vivid real-world analogy to fix the mental model" },
                        practice_question: { type: "string", description: "A targeted question to reinforce the correction" },
                        practice_answer: { type: "string", description: "Answer to the practice question" },
                        severity: { type: "string", enum: ["minor", "moderate", "fundamental"], description: "How deeply this misconception affects understanding" },
                      },
                      required: ["title", "what_student_thinks", "why_its_wrong", "correct_concept", "analogy", "practice_question", "practice_answer", "severity"],
                      additionalProperties: false,
                    },
                  },
                  overall_assessment: { type: "string", description: "Brief overall assessment of the student's understanding gaps" },
                  study_priority: { type: "string", description: "What the student should focus on first" },
                },
                required: ["misconceptions", "overall_assessment", "study_priority"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_misconceptions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to analyze misconceptions" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("misconception-radar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
