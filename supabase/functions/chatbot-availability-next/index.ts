import {
  corsHeaders,
  createAnonClient,
  errorResponse,
  fetchBusinessHours,
  generateHourSlots,
  isBusinessDayOpen,
  isFutureWindow,
  jsonResponse,
  overlaps,
  periodKey,
} from "../_shared/booking.ts";

type OccupancyMap = Record<string, { start: string; end: string }[]>;
type ActiveCourt = {
  id: string;
  name: string;
  surface_type?: string | null;
  photo_url?: string | null;
};

function parseDateParam(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value;
}

function todayInSaoPaulo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(dateValue: string, days: number) {
  const base = new Date(`${dateValue}T12:00:00-03:00`);
  base.setDate(base.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

async function loadActiveCourts(supabase: any): Promise<ActiveCourt[]> {
  let { data: courts, error } = await supabase
    .from("courts")
    .select("id, name, photo_url, surface_type")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    const fallback = await supabase
      .from("courts")
      .select("id, name, surface_type")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (fallback.error) {
      throw fallback.error;
    }

    courts = (fallback.data || []).map((court: any) => ({ ...court, photo_url: null }));
  }

  return (courts || []) as ActiveCourt[];
}

async function loadOccupancyMap(supabase: any, targetDate: string): Promise<OccupancyMap> {
  const occupancy: OccupancyMap = {};

  const { data: bookings, error: bookingsError } = await supabase
    .from("court_bookings")
    .select("court_id, start_time, end_time")
    .eq("date", targetDate)
    .in("status", ["requested", "confirmed", "paid"]);

  if (bookingsError) throw bookingsError;

  for (const booking of bookings || []) {
    occupancy[booking.court_id] ??= [];
    occupancy[booking.court_id].push({ start: booking.start_time, end: booking.end_time });
  }

  const { data: classSessions, error: classError } = await supabase
    .from("class_sessions")
    .select("classes(court_id, start_time, end_time)")
    .eq("date", targetDate)
    .eq("status", "scheduled");

  if (classError) throw classError;

  for (const session of classSessions || []) {
    const classData = (session as any)?.classes;
    if (!classData?.court_id) continue;
    occupancy[classData.court_id] ??= [];
    occupancy[classData.court_id].push({ start: classData.start_time, end: classData.end_time });
  }

  return occupancy;
}

function buildGroupedPeriods(
  courts: ActiveCourt[],
  occupancy: OccupancyMap,
  targetDate: string,
  businessHours: { start: string; end: string },
  now: Date,
) {
  const uniqueSlots = new Map<string, { start: string; end: string }>();
  const daySlots = generateHourSlots(businessHours.start, businessHours.end);

  for (const court of courts) {
    const occupied = occupancy[court.id] || [];
    const freeSlots = daySlots.filter(
      (slot) => !occupied.some((occ) => overlaps(slot.start, slot.end, occ.start, occ.end)),
    );

    for (const slot of freeSlots) {
      if (!isFutureWindow(targetDate, slot.end, now)) continue;
      uniqueSlots.set(`${slot.start}|${slot.end}`, slot);
    }
  }

  const periods = {
    morning: [] as { start: string; end: string }[],
    afternoon: [] as { start: string; end: string }[],
    night: [] as { start: string; end: string }[],
  };

  for (const slot of [...uniqueSlots.values()].sort((a, b) => a.start.localeCompare(b.start))) {
    periods[periodKey(slot.start) as keyof typeof periods].push(slot);
  }

  return periods;
}

function getDayUseAvailability(
  courts: ActiveCourt[],
  occupancy: OccupancyMap,
  targetDate: string,
  businessHours: { start: string; end: string },
  now: Date,
) {
  if (!isFutureWindow(targetDate, businessHours.end, now)) {
    return [] as ActiveCourt[];
  }

  return courts.filter((court) => {
    const occupied = occupancy[court.id] || [];
    return !occupied.some((occ) => overlaps(businessHours.start, businessHours.end, occ.start, occ.end));
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Metodo nao permitido", 405);
  }

  try {
    const url = new URL(req.url);
    const subject = (url.searchParams.get("subject") || "court").trim().toLowerCase();
    const period = (url.searchParams.get("period") || "").trim().toLowerCase();
    const maxDays = Math.min(Math.max(Number(url.searchParams.get("max_days") || 14), 1), 30);
    const maxResults = Math.min(Math.max(Number(url.searchParams.get("max_results") || 1), 1), 10);
    const now = new Date();
    const fromDate = parseDateParam(url.searchParams.get("from_date"), todayInSaoPaulo(now));

    if (!["court", "day_use"].includes(subject)) {
      return errorResponse("subject deve ser court ou day_use", 400);
    }

    if (period && !["morning", "afternoon", "night"].includes(period)) {
      return errorResponse("period deve ser morning, afternoon ou night", 400);
    }

    const supabase = createAnonClient();
    const businessHours = await fetchBusinessHours(supabase);
    const courts = await loadActiveCourts(supabase);

    const found: any[] = [];

    for (let offset = 0; offset < maxDays; offset += 1) {
      const targetDate = addDays(fromDate, offset);
      if (!isBusinessDayOpen(targetDate, businessHours)) continue;

      const occupancy = await loadOccupancyMap(supabase, targetDate);

      if (subject === "day_use") {
        const availableCourts = getDayUseAvailability(courts, occupancy, targetDate, businessHours, now);
        if (availableCourts.length) {
          found.push({
            date: targetDate,
            day_use: {
              booking_type: "day_use",
              start_time: businessHours.start,
              end_time: businessHours.end,
              available_courts_count: availableCourts.length,
              available_courts: availableCourts,
            },
          });
        }

        if (found.length >= maxResults) break;

        continue;
      }

      const groupedPeriods = buildGroupedPeriods(courts, occupancy, targetDate, businessHours, now);
      const periodsToReturn = period
        ? { morning: [], afternoon: [], night: [], [period]: groupedPeriods[period as keyof typeof groupedPeriods] }
        : groupedPeriods;

      const hasAvailability = period
        ? (groupedPeriods[period as keyof typeof groupedPeriods] || []).length > 0
        : Object.values(groupedPeriods).some((items) => items.length > 0);

      if (hasAvailability) {
        found.push({ date: targetDate, periods: periodsToReturn });
      }

      if (found.length >= maxResults) break;
    }

    const first = found[0] || null;
    const isRequestedAvailable = found.some((f) => f.date === fromDate);

    if (maxResults <= 1) {
      if (first) {
        return jsonResponse({
          generated_at: new Date().toISOString(),
          mode: subject === "day_use" ? "day_use" : "grouped",
          subject,
          period: period || null,
          from_date: fromDate,
          next_available_date: first.date,
          is_requested_date_available: isRequestedAvailable,
          available_dates: [first.date],
          business_hours: businessHours,
          availability:
            subject === "day_use"
              ? { date: first.date, day_use: first.day_use }
              : { date: first.date, periods: first.periods },
        });
      }

      return jsonResponse({
        generated_at: new Date().toISOString(),
        mode: subject === "day_use" ? "day_use" : "grouped",
        subject,
        period: period || null,
        from_date: fromDate,
        next_available_date: null,
        is_requested_date_available: false,
        available_dates: [],
        business_hours: businessHours,
        availability: null,
      });
    }

    // maxResults > 1: return list of available dates and whether requested date is available
    return jsonResponse({
      generated_at: new Date().toISOString(),
      mode: subject === "day_use" ? "day_use" : "grouped",
      subject,
      period: period || null,
      from_date: fromDate,
      next_available_date: first ? first.date : null,
      business_hours: businessHours,
      is_requested_date_available: isRequestedAvailable,
      available_dates: found.slice(0, maxResults),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
