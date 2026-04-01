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
      .select("id, status, requester_phone")
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
