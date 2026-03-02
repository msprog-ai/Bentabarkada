import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (userLimit.count >= maxRequests) return false;
  userLimit.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract the latest user message to search for relevant listings
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Search for relevant listings from the database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch approved listings that might match the user's query
    const { data: allListings } = await serviceClient
      .from("listings")
      .select("id, title, description, price, category, condition, location, quantity, image_url")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);

    // Simple keyword matching to find relevant listings
    const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const relevantListings = (allListings || []).filter((listing: any) => {
      const text = `${listing.title} ${listing.description} ${listing.category}`.toLowerCase();
      return searchTerms.some((term: string) => text.includes(term));
    }).slice(0, 10);

    // Build context with listings data
    let listingsContext = "";
    if (relevantListings.length > 0) {
      listingsContext = "\n\nHere are relevant items currently available on BentaBarkada that match the user's interest:\n";
      relevantListings.forEach((l: any, i: number) => {
        listingsContext += `${i + 1}. **${l.title}** - ₱${Number(l.price).toLocaleString()} | Category: ${l.category} | Condition: ${l.condition} | Location: ${l.location} | Qty: ${l.quantity}\n   Description: ${l.description.substring(0, 120)}${l.description.length > 120 ? '...' : ''}\n`;
      });
      listingsContext += "\nPresent these items to the user in a friendly, helpful way. Use the exact titles and prices. If no items match, let them know and suggest browsing categories.";
    } else if (allListings && allListings.length > 0) {
      // Show some popular/recent listings if no direct match
      const recentListings = allListings.slice(0, 5);
      listingsContext = "\n\nNo exact matches found for the user's query. Here are some recent listings they might be interested in:\n";
      recentListings.forEach((l: any, i: number) => {
        listingsContext += `${i + 1}. **${l.title}** - ₱${Number(l.price).toLocaleString()} | Category: ${l.category} | Condition: ${l.condition}\n`;
      });
      listingsContext += "\nLet the user know you couldn't find an exact match, but suggest these recent items or recommend they browse specific categories.";
    }

    const systemPrompt = `You are a helpful marketplace assistant for BentaBarkada, a Philippine marketplace platform where users can buy and sell items.

Your role is to:
- Help users find items they're looking for by showing available listings
- Provide tips on selling items effectively (pricing, descriptions, photos)
- Answer questions about how the marketplace works
- Give advice on safe buying and selling practices
- Provide information about payment methods (GCash, Maya, QR PH, COD)
- Assist with delivery and shipping inquiries

When showing product suggestions, format them clearly with title, price, and key details.
Always respond in English. Be friendly, concise, and helpful.
Keep responses focused on marketplace-related topics.${listingsContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
