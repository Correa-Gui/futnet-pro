import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function phoneLookupKey(phone: string) {
  const normalized = normalizePhone(phone);
  return normalized.length >= 11 ? normalized.slice(-11) : normalized;
}

export function phoneMatches(a: string, b: string) {
  const normalizedA = phoneLookupKey(a);
  const normalizedB = phoneLookupKey(b);
  return (
    normalizedA === normalizedB ||
    normalizedA.slice(-11) === normalizedB.slice(-11)
  );
}

export function generateHourSlots(dayStart: string, dayEnd: string) {
  const slots: { start: string; end: string }[] = [];
  const [startH] = dayStart.split(":").map(Number);
  const [endH] = dayEnd.split(":").map(Number);
  for (let hour = startH; hour < endH; hour += 1) {
    slots.push({
      start: `${String(hour).padStart(2, "0")}:00`,
      end: `${String(hour + 1).padStart(2, "0")}:00`,
    });
  }
  return slots;
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  return aStart < bEnd && aEnd > bStart;
}

export function addOneHour(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const base = new Date(Date.UTC(2000, 0, 1, hour, minute));
  base.setUTCHours(base.getUTCHours() + 1);
  return `${String(base.getUTCHours()).padStart(2, "0")}:${String(
    base.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export function buildIntervals(
  slots: { start: string; end: string }[],
  durationHours: number,
) {
  const ordered = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const slotStarts = new Set(ordered.map((slot) => slot.start));
  const intervals = new Set<string>();

  for (const slot of ordered) {
    let cursor = slot.start;
    let valid = true;
    for (let index = 0; index < durationHours; index += 1) {
      if (!slotStarts.has(cursor)) {
        valid = false;
        break;
      }
      cursor = addOneHour(cursor);
    }
    if (valid) {
      intervals.add(`${slot.start}|${cursor}`);
    }
  }

  return [...intervals].map((value) => {
    const [start, end] = value.split("|");
    return { start, end };
  });
}

export function getDurationHours(startTime: string, endTime: string) {
  return Math.max(1, (toMinutes(endTime) - toMinutes(startTime)) / 60);
}

export function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "requested":
      return "Pendente";
    case "confirmed":
      return "Confirmada";
    case "paid":
      return "Pago";
    case "cancelled":
      return "Cancelada";
    default:
      return "Pendente";
  }
}

export function periodKey(startTime: string) {
  const hour = Number(startTime.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "night";
}

export function toSaoPauloIso(date: string, time: string) {
  const hhmm = time.slice(0, 5);
  return `${date}T${hhmm}:00-03:00`;
}

export function isFutureWindow(date: string, endTime: string, now = new Date()) {
  return new Date(toSaoPauloIso(date, endTime)).getTime() > now.getTime();
}

export async function fetchBusinessHours(supabase: any) {
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "business_hours")
    .single();

  return data?.value
    ? JSON.parse(data.value as string)
    : { start: "08:00", end: "22:00" };
}

export function createAnonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
}

export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
