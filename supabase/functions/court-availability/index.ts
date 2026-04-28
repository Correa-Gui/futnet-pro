import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  fetchBusinessHours,
  getDurationHours,
  isBusinessDayOpen,
  isWithinBusinessHours,
  phoneLookupKey,
} from "../_shared/booking.ts";

async function getBlockedReason(supabase: any, date: string): Promise<string | null> {
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "blocked_dates")
    .maybeSingle();
  try {
    const list: { date: string; reason: string }[] = JSON.parse(data?.value || "[]");
    const entry = list.find((b) => b.date === date);
    return entry ? entry.reason : null;
  } catch {
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateHourSlots(
  dayStart: string,
  dayEnd: string,
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const [startHour] = dayStart.split(":").map(Number);
  const [endHour] = dayEnd.split(":").map(Number);

  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push({
      start: `${String(hour).padStart(2, "0")}:00`,
      end: `${String(hour + 1).padStart(2, "0")}:00`,
    });
  }

  return slots;
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const adminSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const courtId = url.searchParams.get("court_id");
      const targetDate = url.searchParams.get("date");

      if (!courtId || !targetDate) {
        return new Response(
          JSON.stringify({ error: "court_id e date sao obrigatorios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: court, error: courtError } = await supabase
        .from("courts")
        .select("id, name")
        .eq("id", courtId)
        .eq("is_active", true)
        .single();

      if (courtError || !court) {
        return new Response(
          JSON.stringify({ error: "Quadra nao encontrada ou inativa" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const businessHours = await fetchBusinessHours(supabase);
      if (!isBusinessDayOpen(targetDate, businessHours)) {
        return new Response(
          JSON.stringify({
            date: targetDate,
            court_id: courtId,
            court_name: court.name,
            available_slots: [],
            business_hours: businessHours,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const blockedReason = await getBlockedReason(supabase, targetDate);
      if (blockedReason) {
        return new Response(
          JSON.stringify({
            date: targetDate,
            court_id: courtId,
            court_name: court.name,
            available_slots: [],
            blocked: true,
            blocked_reason: blockedReason,
            business_hours: businessHours,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: bookings } = await supabase
        .from("court_bookings")
        .select("start_time, end_time")
        .eq("court_id", courtId)
        .eq("date", targetDate)
        .in("status", ["requested", "confirmed", "paid"]);

      const { data: classSessions } = await supabase
        .from("class_sessions")
        .select("classes(court_id, start_time, end_time)")
        .eq("date", targetDate)
        .eq("status", "scheduled");

      const occupiedByClasses = (classSessions ?? [])
        .map((session: any) => session.classes)
        .filter((classData: any) => classData?.court_id === courtId);

      const occupiedSlots = [
        ...(bookings ?? []).map((booking: any) => ({
          start: booking.start_time,
          end: booking.end_time,
        })),
        ...occupiedByClasses.map((classData: any) => ({
          start: classData.start_time,
          end: classData.end_time,
        })),
      ];

      const allSlots = generateHourSlots(businessHours.start, businessHours.end);
      const availableSlots = allSlots.filter(
        (slot) => !occupiedSlots.some((occupied) => overlaps(slot.start, slot.end, occupied.start, occupied.end)),
      );

      return new Response(
        JSON.stringify({
          date: targetDate,
          court_id: courtId,
          court_name: court.name,
          available_slots: availableSlots,
          business_hours: businessHours,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const {
        court_id,
        date,
        start_time,
        end_time,
        requester_name,
        requester_phone,
        price,
        booking_type,
      } = body;

      const normalizedPhone = String(requester_phone || "").replace(/\D/g, "");
      const normalizedLookupPhone = phoneLookupKey(normalizedPhone);
      const normalizedName = String(requester_name || "").trim();
      const normalizedBookingType = booking_type === "day_use" ? "day_use" : "rental";

      if (!court_id || !date || !start_time || !end_time || !normalizedName || !normalizedPhone) {
        return new Response(
          JSON.stringify({
            error: "Campos obrigatorios: court_id, date, start_time, end_time, requester_name, requester_phone",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (start_time >= end_time) {
        return new Response(
          JSON.stringify({ error: "start_time deve ser anterior a end_time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const businessHours = await fetchBusinessHours(supabase);
      if (!isBusinessDayOpen(date, businessHours)) {
        return new Response(
          JSON.stringify({ error: "A arena nao funciona neste dia." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const blockedReason = await getBlockedReason(supabase, date);
      if (blockedReason) {
        return new Response(
          JSON.stringify({ error: `Data bloqueada: ${blockedReason}` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!isWithinBusinessHours(start_time, end_time, businessHours)) {
        return new Response(
          JSON.stringify({
            error: "Horario fora do funcionamento da arena.",
            business_hours: businessHours,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: conflictBookings } = await supabase
        .from("court_bookings")
        .select("start_time, end_time")
        .eq("court_id", court_id)
        .eq("date", date)
        .in("status", ["requested", "confirmed", "paid"]);

      const hasBookingConflict = (conflictBookings ?? []).some((booking: any) =>
        overlaps(start_time, end_time, booking.start_time, booking.end_time),
      );

      const { data: classSessions } = await supabase
        .from("class_sessions")
        .select("classes(court_id, start_time, end_time)")
        .eq("date", date)
        .eq("status", "scheduled");

      const hasClassConflict = (classSessions ?? [])
        .map((session: any) => session.classes)
        .filter((classData: any) => classData?.court_id === court_id)
        .some((classData: any) => overlaps(start_time, end_time, classData.start_time, classData.end_time));

      if (hasBookingConflict || hasClassConflict) {
        return new Response(
          JSON.stringify({ error: "Horario nao disponivel para esta data" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: pricingRows } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["court_rental_price", "day_use_price"]);

      const pricingMap = Object.fromEntries((pricingRows ?? []).map((row: any) => [row.key, row.value]));
      const durationHours = Math.max(1, getDurationHours(start_time, end_time));
      const resolvedPrice =
        Number(price) > 0
          ? Number(price)
          : normalizedBookingType === "day_use"
            ? Number(pricingMap.day_use_price || 0)
            : Number(pricingMap.court_rental_price || 0) * durationHours;

      const { data: booking, error: insertError } = await adminSupabase
        .from("court_bookings")
        .insert({
          court_id,
          date,
          start_time,
          end_time,
          requester_name: normalizedName,
          requester_phone: normalizedPhone,
          price: resolvedPrice,
          booking_type: normalizedBookingType,
          status: "confirmed",
        })
        .select("id, status, booking_type, price")
        .single();

      if (insertError) {
        throw insertError;
      }

      const { error: bookingUserError } = await adminSupabase
        .from("booking_users")
        .upsert(
          {
            name: normalizedName,
            phone: normalizedPhone,
            normalized_phone: normalizedLookupPhone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "normalized_phone" },
        );

      if (bookingUserError) {
        console.error("Falha ao sincronizar booking_users apos reserva", bookingUserError);
      }

      // Envia WhatsApp de confirmacao — falha silenciosa para nao bloquear a reserva
      try {
        const { data: waRows } = await supabase
          .from("system_config")
          .select("key, value")
          .in("key", ["whatsapp_service_base_url", "whatsapp_instance_name", "booking_confirmation_template"]);

        const waCfg = Object.fromEntries((waRows ?? []).map((r: any) => [r.key, (r.value as string).trim()]));
        const baseUrl = waCfg.whatsapp_service_base_url;
        const instanceName = waCfg.whatsapp_instance_name;
        const templateRaw = waCfg.booking_confirmation_template;

        if (baseUrl && instanceName && templateRaw) {
          const { data: courtRow } = await supabase
            .from("courts")
            .select("name")
            .eq("id", court_id)
            .single();

          const [y, m, d] = date.split("-");
          const formattedDate = `${d}/${m}/${y}`;
          const message = templateRaw
            .replace("{nome}", normalizedName)
            .replace("{quadra}", courtRow?.name ?? "")
            .replace("{data}", formattedDate)
            .replace("{horario_inicio}", start_time.slice(0, 5))
            .replace("{horario_fim}", end_time.slice(0, 5));

          const fullPhone = normalizedPhone.startsWith("55") && normalizedPhone.length >= 12
            ? normalizedPhone
            : `55${normalizedPhone}`;

          await fetch(`${baseUrl.replace(/\/$/, "")}/messages/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: fullPhone, text: message, instance_name: instanceName }),
          });
        }
      } catch (waError) {
        console.error("Falha ao enviar WhatsApp de confirmacao", waError);
      }

      return new Response(
        JSON.stringify({
          booking_id: booking.id,
          status: booking.status,
          booking_type: booking.booking_type,
          price: booking.price,
          booking_user_synced: !bookingUserError,
          message: "Reserva solicitada com sucesso. Aguarde confirmacao.",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as any)?.message ?? "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
