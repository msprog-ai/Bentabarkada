import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { buyerMessage, sellerId, listingId, conversationHistory } = await req.json();

    if (!buyerMessage || !sellerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch seller profile
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", sellerId)
      .single();

    // Fetch listing details if provided
    let listingInfo = "";
    if (listingId) {
      const { data: listing } = await supabase
        .from("listings")
        .select("title, description, price, condition, location, city")
        .eq("id", listingId)
        .single();

      if (listing) {
        listingInfo = `
Product Information:
- Title: ${listing.title}
- Price: ₱${listing.price}
- Condition: ${listing.condition}
- Location: ${listing.city || listing.location}
- Description: ${listing.description}
`;
      }
    }

    const sellerName = sellerProfile?.display_name || "the seller";

    const systemPrompt = `You are an AI assistant helping manage customer inquiries for ${sellerName}'s shop on BentaBarkada, a Philippine marketplace.

Your role:
1. Warmly greet customers and help answer common questions about products
2. Provide information about the item if asked (price, condition, availability)
3. Answer FAQs about payment (GCash, Maya, QR PH, COD available) and delivery
4. If the customer wants to negotiate price, schedule meetup, or has complex questions, offer to connect them with the seller
5. Be helpful, friendly, and professional

${listingInfo}

Guidelines:
- Respond naturally in Filipino, Taglish, or English based on how the customer messages
- Keep responses concise and helpful
- If you cannot answer something or the customer specifically asks to talk to the seller, respond with: [CONNECT_TO_SELLER]
- Always be polite and professional

Common questions you can answer:
- Product details and specifications
- Payment methods available (GCash, Maya, QR PH, Cash on Delivery)
- General shipping/delivery inquiries
- Store policies

Questions that need the seller:
- Price negotiations
- Meetup arrangements
- Specific availability/stock questions
- Custom requests`;

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: buyerMessage },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", needsHuman: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";

    // Check if AI wants to connect to seller
    const needsHuman = aiResponse.includes("[CONNECT_TO_SELLER]");
    const cleanResponse = aiResponse.replace("[CONNECT_TO_SELLER]", "").trim();

    return new Response(
      JSON.stringify({
        message: cleanResponse,
        needsHuman,
        isAutoReply: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seller chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        needsHuman: true 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});