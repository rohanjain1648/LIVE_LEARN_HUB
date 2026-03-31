import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, title } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are a knowledge graph expert. Extract key concepts and their relationships from educational text to create an interactive concept map. Focus on:
- Core concepts (nodes): Important terms, ideas, processes, entities — maximum 15 nodes
- Relationships (edges): Directed connections between concepts with descriptive labels (e.g., "requires", "produces", "is a type of", "causes", "affects")
- Hierarchy: Identify which concepts are central (high connections) vs peripheral
- Create a MEANINGFUL graph — not just a list. The relationships should tell a story.

Node categories:
- "concept": Abstract ideas or terms
- "process": Actions or processes  
- "entity": Physical things, organisms, structures
- "principle": Laws, rules, or principles`,
          },
          {
            role: "user",
            content: `Extract a concept map from this text:\n\n${text.slice(0, 4000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_concept_map",
              description: "Generate a concept map with nodes and directed edges",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Title for the concept map" },
                  summary: { type: "string", description: "1-2 sentence summary of what the concept map represents" },
                  nodes: {
                    type: "array",
                    description: "Knowledge nodes (max 15)",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique short ID, e.g. 'node_1'" },
                        label: { type: "string", description: "Short concept name (1-4 words)" },
                        description: { type: "string", description: "Brief definition or explanation (1-2 sentences)" },
                        category: { type: "string", enum: ["concept", "process", "entity", "principle"] },
                        importance: { type: "string", enum: ["central", "major", "supporting"] },
                      },
                      required: ["id", "label", "description", "category", "importance"],
                      additionalProperties: false,
                    },
                  },
                  edges: {
                    type: "array",
                    description: "Directed relationships between nodes",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", description: "Source node ID" },
                        target: { type: "string", description: "Target node ID" },
                        label: { type: "string", description: "Relationship label (1-4 words, e.g. 'produces', 'requires', 'is part of')" },
                      },
                      required: ["source", "target", "label"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "summary", "nodes", "edges"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_concept_map" } },
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

    return new Response(JSON.stringify({ error: "Failed to generate concept map" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("concept-map error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
