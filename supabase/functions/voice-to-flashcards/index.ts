import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const cardCount = parseInt(formData.get("count") as string || "10", 10);

    if (!audioFile) throw new Error("No audio file provided");

    // Convert audio to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Determine MIME type
    const mimeType = audioFile.type || "audio/webm";

    // Step 1: Transcribe audio using Gemini multimodal
    const transcribeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a transcription assistant. Transcribe the audio accurately. Return ONLY the transcription text, nothing else.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "wav",
                },
              },
              {
                type: "text",
                text: "Please transcribe this audio recording accurately.",
              },
            ],
          },
        ],
      }),
    });

    if (!transcribeResponse.ok) {
      if (transcribeResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (transcribeResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await transcribeResponse.text();
      console.error("Transcription error:", transcribeResponse.status, errText);
      throw new Error("Audio transcription failed");
    }

    const transcribeData = await transcribeResponse.json();
    const transcript = transcribeData.choices?.[0]?.message?.content || "";

    if (!transcript.trim()) {
      throw new Error("Could not transcribe audio. Please ensure the audio is clear and try again.");
    }

    // Step 2: Generate flashcards from transcript
    const flashcardResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a flashcard generator. Create study flashcards from the given lecture transcript. Each card has a 'front' (question/term) and 'back' (answer/definition). Focus on key concepts, definitions, and important facts. Make cards concise and effective for memorization.",
          },
          {
            role: "user",
            content: `Generate ${cardCount} flashcards from this lecture transcript:\n\n${transcript}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_flashcards",
              description: "Generate flashcards from a lecture transcript",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A short title for the flashcard deck based on the lecture topic" },
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { type: "string", description: "Question or term" },
                        back: { type: "string", description: "Answer or definition" },
                      },
                      required: ["front", "back"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "cards"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_flashcards" } },
      }),
    });

    if (!flashcardResponse.ok) {
      const errText = await flashcardResponse.text();
      console.error("Flashcard generation error:", flashcardResponse.status, errText);
      throw new Error("Flashcard generation failed");
    }

    const flashcardData = await flashcardResponse.json();
    const toolCall = flashcardData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in flashcard response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ transcript, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-to-flashcards error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
