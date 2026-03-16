import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation helpers
function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim().slice(0, 1000);
}

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const VALID_ACTIONS = [
  'approve_verification', 'reject_verification',
  'approve_listing', 'reject_listing',
  'approve_user', 'reject_user',
  'confirm_payment', 'reject_payment',
  'suspend_user', 'reactivate_user',
];

const VALID_TABS = ['orders', 'listings', 'users', 'verifications', 'audit_logs'];

async function logAuditAction(
  adminClient: any,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
  ipAddress: string | null = null,
) {
  try {
    await adminClient.from('audit_logs').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user via getClaims
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: roleData } = await adminClient
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get IP for audit logging
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    const url = new URL(req.url);
    const tab = url.searchParams.get("tab") || "orders";

    // Validate tab parameter
    if (!VALID_TABS.includes(tab)) {
      return new Response(JSON.stringify({ error: "Invalid tab parameter" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle POST actions
    if (req.method === "POST") {
      const body = await req.json();
      const action = sanitizeString(body.action);

      if (!VALID_ACTIONS.includes(action)) {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verification actions
      if (action === "approve_verification" || action === "reject_verification") {
        if (!isValidUUID(body.verification_id)) {
          return new Response(JSON.stringify({ error: "Invalid verification_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const status = action === "approve_verification" ? "approved" : "rejected";
        const updateData: any = { status, reviewed_by: userId, reviewed_at: new Date().toISOString() };
        if (body.rejection_reason) updateData.rejection_reason = sanitizeString(body.rejection_reason);

        const { error } = await adminClient.from("seller_verifications").update(updateData).eq("id", body.verification_id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        // If approved, also approve the user profile
        if (action === "approve_verification") {
          const { data: verif } = await adminClient.from("seller_verifications").select("user_id").eq("id", body.verification_id).single();
          if (verif) {
            await adminClient.from("profiles").update({ is_approved: true }).eq("user_id", verif.user_id);
          }
        }

        await logAuditAction(adminClient, userId, action, 'seller_verification', body.verification_id, {
          status,
          rejection_reason: body.rejection_reason || null,
        }, clientIp);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Listing actions
      if (action === "approve_listing" || action === "reject_listing") {
        if (!isValidUUID(body.listing_id)) {
          return new Response(JSON.stringify({ error: "Invalid listing_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const approval_status = action === "approve_listing" ? "approved" : "rejected";
        const { error } = await adminClient.from("listings").update({ approval_status }).eq("id", body.listing_id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        await logAuditAction(adminClient, userId, action, 'listing', body.listing_id, { approval_status }, clientIp);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // User actions
      if (action === "approve_user" || action === "reject_user" || action === "suspend_user" || action === "reactivate_user") {
        if (!isValidUUID(body.user_id)) {
          return new Response(JSON.stringify({ error: "Invalid user_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const is_approved = action === "approve_user" || action === "reactivate_user";
        const { error } = await adminClient.from("profiles").update({ is_approved }).eq("user_id", body.user_id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        await logAuditAction(adminClient, userId, action, 'user', body.user_id, { is_approved }, clientIp);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Payment review actions
      if (action === "confirm_payment" || action === "reject_payment") {
        if (!isValidUUID(body.order_id)) {
          return new Response(JSON.stringify({ error: "Invalid order_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const payment_status = action === "confirm_payment" ? "confirmed" : "rejected";
        const updateData: any = { payment_status };
        if (action === "confirm_payment") {
          updateData.status = "confirmed";
        }
        const { error } = await adminClient.from("orders").update(updateData).eq("id", body.order_id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        await logAuditAction(adminClient, userId, action, 'order', body.order_id, { payment_status }, clientIp);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Log data access for sensitive tabs
    if (tab === 'verifications' || tab === 'audit_logs') {
      await logAuditAction(adminClient, userId, `view_${tab}`, tab, null, {}, clientIp);
    }

    // GET data
    let data: any = null;

    if (tab === "orders") {
      const { data: orders } = await adminClient
        .from("orders")
        .select("*, order_items(*, listings(title, image_url))")
        .order("created_at", { ascending: false })
        .limit(100);

      const userIds = new Set<string>();
      orders?.forEach((o: any) => { userIds.add(o.buyer_id); userIds.add(o.seller_id); });
      const { data: profiles } = await adminClient
        .from("profiles").select("user_id, display_name, phone").in("user_id", Array.from(userIds));

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      data = orders?.map((o: any) => ({
        ...o,
        buyer_profile: profileMap[o.buyer_id] || null,
        seller_profile: profileMap[o.seller_id] || null,
      }));
    } else if (tab === "listings") {
      const { data: listings } = await adminClient
        .from("listings").select("*").order("created_at", { ascending: false }).limit(200);

      const userIds = new Set<string>();
      listings?.forEach((l: any) => userIds.add(l.user_id));
      const { data: profiles } = await adminClient
        .from("profiles").select("user_id, display_name").in("user_id", Array.from(userIds));

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      data = listings?.map((l: any) => ({ ...l, seller_name: profileMap[l.user_id]?.display_name || "Unknown" }));
    } else if (tab === "users") {
      const { data: profiles } = await adminClient
        .from("profiles").select("*").order("created_at", { ascending: false }).limit(200);

      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u: any) => { emailMap[u.id] = u.email || ""; });

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
    } else if (tab === "verifications") {
      const { data: verifications } = await adminClient
        .from("seller_verifications").select("*").order("created_at", { ascending: false }).limit(200);

      const userIds = new Set<string>();
      verifications?.forEach((v: any) => userIds.add(v.user_id));

      const { data: profiles } = await adminClient
        .from("profiles").select("user_id, display_name").in("user_id", Array.from(userIds));

      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u: any) => { emailMap[u.id] = u.email || ""; });

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      data = await Promise.all(
        (verifications || []).map(async (v: any) => {
          const urls: any = {};
          for (const field of ['id_front_url', 'id_back_url', 'selfie_url']) {
            if (v[field]) {
              const { data: signedData } = await adminClient.storage
                .from('verification-documents').createSignedUrl(v[field], 3600);
              urls[field + '_signed'] = signedData?.signedUrl || null;
            }
          }
          return {
            ...v, ...urls,
            display_name: profileMap[v.user_id]?.display_name || "Unknown",
            email: emailMap[v.user_id] || "",
          };
        })
      );
    } else if (tab === "audit_logs") {
      const { data: logs } = await adminClient
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      // Get admin display names
      const adminIds = new Set<string>();
      logs?.forEach((l: any) => adminIds.add(l.admin_id));
      const { data: profiles } = await adminClient
        .from("profiles").select("user_id, display_name").in("user_id", Array.from(adminIds));

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      data = logs?.map((l: any) => ({
        ...l,
        admin_name: profileMap[l.admin_id]?.display_name || "Unknown",
      }));
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
