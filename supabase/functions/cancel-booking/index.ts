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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Usa service role para bypassar RLS e ter controle de autorização no código
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { booking_id, requester_phone } = body;

    if (!booking_id || !requester_phone) {
      return new Response(
        JSON.stringify({ error: "booking_id e requester_phone são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: booking, error: fetchError } = await supabase
      .from("court_bookings")
      .select("id, status, requester_phone, requester_name, start_time, end_time, date, court_id")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ error: "Reserva não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica propriedade: compara apenas os dígitos, ignora código de país
    const normalize = (p: string) => p.replace(/\D/g, "").slice(-11);
    if (normalize(booking.requester_phone) !== normalize(requester_phone)) {
      return new Response(
        JSON.stringify({ error: "Reserva não pertence a este número" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Reserva já cancelada" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Reservas pagas não podem ser canceladas pelo chatbot. Entre em contato com a equipe." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("court_bookings")
      .update({ status: "cancelled" })
      .eq("id", booking_id);

    if (updateError) {
      throw updateError;
    }

    // Envia WhatsApp — falha silenciosa para não bloquear o cancelamento
    try {
      const { data: waRows } = await supabase
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

      if (baseUrl && instanceName) {
        const { data: courtRow } = await supabase
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
      }
    } catch (waError) {
      console.error("Falha ao enviar WhatsApp de cancelamento", waError);
    }

    return new Response(
      JSON.stringify({ status: "cancelado", message: "Reserva cancelada com sucesso." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
