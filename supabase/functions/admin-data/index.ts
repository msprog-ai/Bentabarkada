import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const tab = url.searchParams.get("tab") || "orders";

    let data: any = null;

    if (tab === "orders") {
      const { data: orders } = await adminClient
        .from("orders")
        .select("*, order_items(*, listings(title, image_url))")
        .order("created_at", { ascending: false })
        .limit(100);

      // Get buyer/seller profiles
      const userIds = new Set<string>();
      orders?.forEach((o: any) => { userIds.add(o.buyer_id); userIds.add(o.seller_id); });
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", Array.from(userIds));

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      data = orders?.map((o: any) => ({
        ...o,
        buyer_profile: profileMap[o.buyer_id] || null,
        seller_profile: profileMap[o.seller_id] || null,
      }));
    } else if (tab === "listings") {
      const { data: listings } = await adminClient
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const userIds = new Set<string>();
      listings?.forEach((l: any) => userIds.add(l.user_id));
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", Array.from(userIds));

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      data = listings?.map((l: any) => ({
        ...l,
        seller_name: profileMap[l.user_id]?.display_name || "Unknown",
      }));
    } else if (tab === "users") {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      // Get auth user emails
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u: any) => { emailMap[u.id] = u.email || ""; });

      // Get roles
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const roleMap: Record<string, string[]> = {};
      roles?.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      data = profiles?.map((p: any) => ({
        ...p,
        email: emailMap[p.user_id] || "",
        roles: roleMap[p.user_id] || [],
      }));
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
