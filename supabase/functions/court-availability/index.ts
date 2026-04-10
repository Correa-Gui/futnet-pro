import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { phoneLookupKey } from "../_shared/booking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Gera slots de 1 hora entre start e end (ex: "08:00" a "22:00").
 */
function generateHourSlots(
  dayStart: string,
  dayEnd: string
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const [startH] = dayStart.split(":").map(Number);
  const [endH] = dayEnd.split(":").map(Number);
  for (let h = startH; h < endH; h++) {
    slots.push({
      start: `${String(h).padStart(2, "0")}:00`,
      end: `${String(h + 1).padStart(2, "0")}:00`,
    });
  }
  return slots;
}

/**
 * Retorna true se dois intervalos de tempo se sobrepõem.
 */
function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const adminSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── GET: consultar disponibilidade ──────────────────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const courtId = url.searchParams.get("court_id");
      const date = url.searchParams.get("date");

      if (!courtId || !date) {
        return new Response(
          JSON.stringify({ error: "court_id e date são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verifica se a quadra existe e está ativa
      const { data: court, error: courtError } = await supabase
        .from("courts")
        .select("id, name")
        .eq("id", courtId)
        .eq("is_active", true)
        .single();

      if (courtError || !court) {
        return new Response(
          JSON.stringify({ error: "Quadra não encontrada ou inativa" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Busca horário de funcionamento do system_config
      const { data: configRow } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "business_hours")
        .single();

      const businessHours = configRow?.value
        ? JSON.parse(configRow.value as string)
        : { start: "08:00", end: "22:00" };

      // Busca reservas confirmadas/pagas no dia
      const { data: bookings } = await supabase
        .from("court_bookings")
        .select("start_time, end_time")
        .eq("court_id", courtId)
        .eq("date", date)
        .in("status", ["requested", "confirmed", "paid"]);

      // Busca sessões de aula agendadas no dia (qualquer quadra que seja esta quadra)
      const { data: classSessions } = await supabase
        .from("class_sessions")
        .select("classes(court_id, start_time, end_time)")
        .eq("date", date)
        .eq("status", "scheduled");

      const occupiedByClasses = (classSessions ?? [])
        .map((s: any) => s.classes)
        .filter((c: any) => c?.court_id === courtId);

      const allOccupied = [
        ...(bookings ?? []).map((b: any) => ({ start: b.start_time, end: b.end_time })),
        ...occupiedByClasses.map((c: any) => ({ start: c.start_time, end: c.end_time })),
      ];

      const allSlots = generateHourSlots(businessHours.start, businessHours.end);

      const availableSlots = allSlots.filter(
        (slot) => !allOccupied.some((occ) => overlaps(slot.start, slot.end, occ.start, occ.end))
      );

      return new Response(
        JSON.stringify({
          date,
          court_id: courtId,
          court_name: court.name,
          available_slots: availableSlots,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST: criar reserva ─────────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const { court_id, date, start_time, end_time, requester_name, requester_phone, price } = body;
      const normalizedPhone = String(requester_phone || "").replace(/\D/g, "");
      const normalizedLookupPhone = phoneLookupKey(normalizedPhone);
      const normalizedName = String(requester_name || "").trim();

      if (!court_id || !date || !start_time || !end_time || !normalizedName || !normalizedPhone) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios: court_id, date, start_time, end_time, requester_name, requester_phone" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (start_time >= end_time) {
        return new Response(
          JSON.stringify({ error: "start_time deve ser anterior a end_time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verifica conflito com reservas existentes
      const { data: conflictBookings } = await supabase
        .from("court_bookings")
        .select("id")
        .eq("court_id", court_id)
        .eq("date", date)
        .in("status", ["requested", "confirmed", "paid"]);

      const hasBookingConflict = (conflictBookings ?? []).some((b: any) =>
        overlaps(start_time, end_time, b.start_time, b.end_time)
      );

      // Verifica conflito com sessões de aula
      const { data: classSessions } = await supabase
        .from("class_sessions")
        .select("classes(court_id, start_time, end_time)")
        .eq("date", date)
        .eq("status", "scheduled");

      const hasClassConflict = (classSessions ?? [])
        .map((s: any) => s.classes)
        .filter((c: any) => c?.court_id === court_id)
        .some((c: any) => overlaps(start_time, end_time, c.start_time, c.end_time));

      if (hasBookingConflict || hasClassConflict) {
        return new Response(
          JSON.stringify({ error: "Horário não disponível para esta data" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: booking, error: insertError } = await supabase
        .from("court_bookings")
        .insert({
          court_id,
          date,
          start_time,
          end_time,
          requester_name: normalizedName,
          requester_phone: normalizedPhone,
          price: price ?? null,
          status: "requested",
        })
        .select("id, status")
        .single();

      if (insertError) {
        throw insertError;
      }

      // Salva/atualiza o usuário na tabela booking_users (via service role)
      const { error: bookingUserError } = await adminSupabase
        .from("booking_users")
        .upsert(
          {
            name: normalizedName,
            phone: normalizedPhone,
            normalized_phone: normalizedLookupPhone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "normalized_phone" }
        );

      if (bookingUserError) {
        console.error("Falha ao sincronizar booking_users após reserva", bookingUserError);
      }

      return new Response(
        JSON.stringify({
          booking_id: booking.id,
          status: booking.status,
          booking_user_synced: !bookingUserError,
          message: "Reserva solicitada com sucesso. Aguarde confirmação.",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
