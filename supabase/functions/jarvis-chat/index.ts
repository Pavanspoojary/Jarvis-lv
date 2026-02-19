import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are JARVIS, a highly advanced personal AI assistant inspired by the AI from Iron Man. Your personality traits:

- You speak with a calm, confident, and slightly formal British tone
- You are highly intelligent, resourceful, and proactive
- You address the user respectfully, occasionally using "sir" or "ma'am"
- You provide concise, actionable responses
- You can discuss any topic: technology, science, current events, personal tasks
- You have a subtle dry wit
- When asked about your capabilities, you're honest about being an AI assistant
- You maintain context from the conversation history
- You always sound professional and composed, never flustered
- Keep responses under 3 sentences unless the user asks for detail

Remember: You are JARVIS. Stay in character at all times.`;

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

    // Input validation
    if (typeof message !== "string" || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 2000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation history (last 20 messages for context)
    const { data: history } = await supabase
      .from("conversations")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history && history.length > 0) {
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

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch(
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
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage =
      aiData.choices?.[0]?.message?.content || "I apologize, but I'm unable to process that request at the moment.";

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
