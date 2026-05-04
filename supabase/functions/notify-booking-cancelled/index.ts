import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: hasRole } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!hasRole) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking, error: bookingError } = await serviceClient
      .from("court_bookings")
      .select("id, requester_name, requester_phone, start_time, end_time, date, court_id")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: waRows } = await serviceClient
      .from("system_config")
      .select("key, value")
      .in("key", [
        "whatsapp_service_base_url",
        "whatsapp_instance_name",
        "booking_cancellation_template",
        "booking_cancellation_group_template",
        "admin_group_jid",
      ]);

    const cfg = Object.fromEntries((waRows ?? []).map((r: any) => [r.key, (r.value as string).trim()]));
    const baseUrl = cfg.whatsapp_service_base_url;
    const instanceName = cfg.whatsapp_instance_name;
    const clientTpl = cfg.booking_cancellation_template;
    const groupTpl = cfg.booking_cancellation_group_template;
    const adminGroupJid = cfg.admin_group_jid;

    if (!baseUrl || !instanceName) {
      return new Response(JSON.stringify({ sent: false, reason: "WhatsApp not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: courtRow } = await serviceClient
      .from("courts")
      .select("name")
      .eq("id", booking.court_id)
      .single();

    const courtName = courtRow?.name ?? "";
    const [y, m, d] = (booking.date as string).split("-");
    const formattedDate = `${d}/${m}/${y}`;
    const endpoint = `${baseUrl.replace(/\/$/, "")}/messages/send`;

    const interpolate = (tpl: string) =>
      tpl
        .replace("{nome}", booking.requester_name || "")
        .replace("{quadra}", courtName)
        .replace("{data}", formattedDate)
        .replace("{horario_inicio}", (booking.start_time as string).slice(0, 5))
        .replace("{horario_fim}", (booking.end_time as string).slice(0, 5))
        .replace("{telefone}", booking.requester_phone || "");

    if (clientTpl) {
      const phone = (booking.requester_phone as string) || "";
      const fullPhone =
        phone.replace(/\D/g, "").startsWith("55") && phone.replace(/\D/g, "").length >= 12
          ? phone.replace(/\D/g, "")
          : `55${phone.replace(/\D/g, "")}`;
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: fullPhone, text: interpolate(clientTpl), instance_name: instanceName }),
      });
    }

    if (adminGroupJid && groupTpl) {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: adminGroupJid, text: interpolate(groupTpl), instance_name: instanceName }),
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
