import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are JARVIS, a highly advanced personal AI assistant inspired by the AI from Iron Man.

PERSONALITY:
- Calm, confident, slightly formal British tone
- Highly intelligent, resourceful, proactive
- Address user as "sir" or "ma'am" occasionally
- Subtle dry wit
- Professional, never flustered
- Keep responses under 3 sentences unless asked for detail

TOOLS: You have access to tools. When the user asks for something a tool can handle, use the appropriate tool.
- weather: Get weather for a location
- web_search: Search the web for information
- create_note: Save a note to long-term memory
- list_notes: List saved notes
- create_reminder: Set a reminder
- list_reminders: List reminders
- system_info: Get system performance information

Always stay in character as JARVIS.`;

const tools = [
  {
    type: "function",
    function: {
      name: "weather",
      description: "Get current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name or location" },
        },
        required: ["location"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Save a note to long-term memory",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          content: { type: "string", description: "Note content" },
          category: { type: "string", description: "Category (general, work, personal, idea)" },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "List saved notes from memory",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category filter" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Set a reminder for the user",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Reminder title" },
          description: { type: "string", description: "Additional details" },
          remind_at: { type: "string", description: "ISO 8601 datetime for the reminder" },
        },
        required: ["title", "remind_at"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_reminders",
      description: "List upcoming reminders",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "system_info",
      description: "Get system performance and status information",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

async function executeToolCall(
  name: string,
  args: Record<string, any>,
  sessionId: string,
  supabase: any
): Promise<string> {
  switch (name) {
    case "weather": {
      try {
        const res = await fetch(
          `https://wttr.in/${encodeURIComponent(args.location)}?format=j1`
        );
        if (!res.ok) return JSON.stringify({ error: "Could not fetch weather" });
        const data = await res.json();
        const current = data.current_condition?.[0];
        return JSON.stringify({
          location: args.location,
          temp_c: current?.temp_C,
          temp_f: current?.temp_F,
          condition: current?.weatherDesc?.[0]?.value,
          humidity: current?.humidity,
          wind_mph: current?.windspeedMiles,
          feels_like_c: current?.FeelsLikeC,
        });
      } catch {
        return JSON.stringify({ error: "Weather service unavailable" });
      }
    }

    case "web_search": {
      const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (!apiKey) return JSON.stringify({ error: "Web search not configured" });
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: args.query, limit: 5 }),
        });
        const data = await res.json();
        const results = (data.data || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.description,
        }));
        return JSON.stringify({ results });
      } catch {
        return JSON.stringify({ error: "Search failed" });
      }
    }

    case "create_note": {
      const { error } = await supabase.from("notes").insert({
        session_id: sessionId,
        title: args.title,
        content: args.content,
        category: args.category || "general",
      });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, title: args.title });
    }

    case "list_notes": {
      let query = supabase
        .from("notes")
        .select("title, content, category, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (args.category) query = query.eq("category", args.category);
      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ notes: data || [] });
    }

    case "create_reminder": {
      const { error } = await supabase.from("reminders").insert({
        session_id: sessionId,
        title: args.title,
        description: args.description || null,
        remind_at: args.remind_at,
      });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, title: args.title, remind_at: args.remind_at });
    }

    case "list_reminders": {
      const { data, error } = await supabase
        .from("reminders")
        .select("title, description, remind_at, completed")
        .eq("session_id", sessionId)
        .eq("completed", false)
        .order("remind_at", { ascending: true })
        .limit(10);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ reminders: data || [] });
    }

    case "system_info": {
      return JSON.stringify({
        status: "operational",
        ai_model: "google/gemini-3-flash-preview",
        voice_engine: "elevenlabs",
        vision_system: "mediapipe",
        memory: "active",
        tools_available: tools.length,
        uptime: "continuous",
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId } = await req.json();

    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing message or sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof message !== "string" || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 2000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation history
    const { data: history } = await supabase
      .from("conversations")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages: Array<{ role: string; content: string; tool_call_id?: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    // Store user message
    await supabase.from("conversations").insert({
      session_id: sessionId,
      role: "user",
      content: message,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // First call - may include tool calls
    let aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", status, errorText);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly.", response: "I'm receiving too many requests at the moment, sir. Please give me a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted.", response: "I'm afraid my processing credits have been depleted, sir." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway returned ${status}`);
    }

    let aiData = await aiResponse.json();
    let choice = aiData.choices?.[0];

    // Handle tool calls (up to 3 rounds)
    let rounds = 0;
    while (choice?.message?.tool_calls && rounds < 3) {
      rounds++;
      const toolCalls = choice.message.tool_calls;

      // Add assistant message with tool calls
      messages.push(choice.message);

      // Execute each tool call
      for (const tc of toolCalls) {
        const args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;

        console.log(`Executing tool: ${tc.function.name}`, args);
        const result = await executeToolCall(tc.function.name, args, sessionId, supabase);

        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tc.id,
        });
      }

      // Call AI again with tool results
      aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            tools,
            max_tokens: 1000,
            temperature: 0.7,
          }),
        }
      );

      if (!aiResponse.ok) throw new Error(`AI Gateway returned ${aiResponse.status}`);
      aiData = await aiResponse.json();
      choice = aiData.choices?.[0];
    }

    const assistantMessage =
      choice?.message?.content || "I apologize, but I'm unable to process that request at the moment.";

    // Store assistant response
    await supabase.from("conversations").insert({
      session_id: sessionId,
      role: "assistant",
      content: assistantMessage,
    });

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jarvis-chat:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred processing your request",
        response: "I apologize, sir. I seem to be experiencing a temporary disruption. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
