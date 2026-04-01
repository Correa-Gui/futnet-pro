import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
  addDays,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  GraduationCap,
  LayoutGrid,
  CalendarRange,
  User,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { useBusinessHours } from "@/hooks/useBusinessHours";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type ViewMode = "week" | "day";
type Court = { id: string; name: string };

type CalendarEvent =
  | {
      type: "class";
      id: string;
      name: string;
      court: string;
      courtId: string;
      startTime: string;
      endTime: string;
    }
  | {
      type: "booking";
      id: string;
      name: string;
      court: string;
      courtId: string;
      startTime: string;
      endTime: string;
      date: string;
      status: BookingStatus;
      phone: string;
      price: number;
    };

const HOUR_HEIGHT = 64; // px per hour
const TIME_COL_W = 52; // px for time label column

const STATUS_STYLE: Record<BookingStatus, string> = {
  requested: "bg-amber-50 dark:bg-amber-950/40 border-l-amber-400",
  confirmed: "bg-blue-50 dark:bg-blue-950/40 border-l-blue-500",
  paid:      "bg-emerald-50 dark:bg-emerald-950/40 border-l-emerald-500",
  cancelled: "bg-red-50 dark:bg-red-950/40 border-l-red-400",
};

const STATUS_TEXT: Record<BookingStatus, string> = {
  requested: "text-amber-700 dark:text-amber-400",
  confirmed: "text-blue-700 dark:text-blue-400",
  paid:      "text-emerald-700 dark:text-emerald-400",
  cancelled: "text-red-700 dark:text-red-400",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Assigns lane (column) to each event so overlapping events appear side-by-side */
function layoutEvents(events: CalendarEvent[]) {
  if (!events.length) return [];
  const sorted = [...events].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  const colEnds: number[] = [];
  const lanes = sorted.map((ev) => {
    const startMins = timeToMinutes(ev.startTime);
    let col = colEnds.findIndex((end) => end <= startMins);
    if (col === -1) col = colEnds.length;
    colEnds[col] = timeToMinutes(ev.endTime);
    return col;
  });

  return sorted.map((event, i) => {
    const startMins = timeToMinutes(event.startTime);
    const endMins = timeToMinutes(event.endTime);
    const totalCols = sorted.reduce((max, _, j) => {
      const s = timeToMinutes(sorted[j].startTime);
      const e = timeToMinutes(sorted[j].endTime);
      if (s < endMins && e > startMins) return Math.max(max, lanes[j] + 1);
      return max;
    }, 1);
    return { event, col: lanes[i], totalCols };
  });
}

export default function Bookings() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const { data: businessHours } = useBusinessHours();

  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];
  const openHour = businessHours?.open_hour ?? 6;
  const closeHour = businessHours?.close_hour ?? 22;
  const HOURS = Array.from({ length: closeHour - openHour }, (_, i) => i + openHour);
  const totalHeight = HOURS.length * HOUR_HEIGHT;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const filteredWeekDays = weekDays.filter((day) => openDays.includes(getDay(day)));

  const dateRange = {
    from: format(viewMode === "day" ? currentDate : weekStart, "yyyy-MM-dd"),
    to: format(viewMode === "day" ? currentDate : weekEnd, "yyyy-MM-dd"),
  };

  const { data: courts = [] } = useQuery({
    queryKey: ["admin-courts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Court[];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings-range", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_bookings")
        .select("*, courts(name, id)")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, courts(name, id)")
        .eq("status", "active")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase
        .from("court_bookings")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings-range"] });
      toast.success("Status atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = {
    total: bookings.length,
    requested: bookings.filter((b) => b.status === "requested").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    paid: bookings.filter((b) => b.status === "paid").length,
  };

  function getEventsForDay(day: Date): CalendarEvent[] {
    const dayOfWeek = getDay(day);
    const dateStr = format(day, "yyyy-MM-dd");
    const dayClasses: CalendarEvent[] = classes
      .filter((c) => c.day_of_week.includes(dayOfWeek))
      .map((c) => ({
        type: "class" as const,
        id: c.id,
        name: c.name,
        court: (c as any).courts?.name || "",
        courtId: (c as any).courts?.id || "",
        startTime: c.start_time,
        endTime: c.end_time,
      }));
    const dayBookings: CalendarEvent[] = bookings
      .filter((b) => b.date === dateStr)
      .map((b) => ({
        type: "booking" as const,
        id: b.id,
        name: b.requester_name,
        court: (b as any).courts?.name || "",
        courtId: (b as any).courts?.id || "",
        startTime: b.start_time,
        endTime: b.end_time,
        date: b.date,
        status: b.status as BookingStatus,
        phone: b.requester_phone,
        price: Number(b.price),
      }));
    return [...dayClasses, ...dayBookings];
  }

  function getEventsForCourt(courtId: string): CalendarEvent[] {
    const dayOfWeek = getDay(currentDate);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const courtClasses: CalendarEvent[] = classes
      .filter((c) => (c as any).courts?.id === courtId && c.day_of_week.includes(dayOfWeek))
      .map((c) => ({
        type: "class" as const,
        id: c.id,
        name: c.name,
        court: courts.find((ct) => ct.id === courtId)?.name || "",
        courtId,
        startTime: c.start_time,
        endTime: c.end_time,
      }));
    const courtBookings: CalendarEvent[] = bookings
      .filter((b) => b.date === dateStr && (b as any).courts?.id === courtId)
      .map((b) => ({
        type: "booking" as const,
        id: b.id,
        name: b.requester_name,
        court: courts.find((ct) => ct.id === courtId)?.name || "",
        courtId,
        startTime: b.start_time,
        endTime: b.end_time,
        date: b.date,
        status: b.status as BookingStatus,
        phone: b.requester_phone,
        price: Number(b.price),
      }));
    return [...courtClasses, ...courtBookings];
  }

  function EventCard({
    event,
    col,
    totalCols,
  }: {
    event: CalendarEvent;
    col: number;
    totalCols: number;
  }) {
    const startMins = timeToMinutes(event.startTime);
    const endMins = timeToMinutes(event.endTime);
    const top = (startMins - openHour * 60) * (HOUR_HEIGHT / 60);
    const height = Math.max((endMins - startMins) * (HOUR_HEIGHT / 60), 26);
    const pctW = 100 / totalCols;
    const isShort = height < 44;

    if (event.type === "class") {
      return (
        <div
          style={{
            position: "absolute",
            top,
            height,
            left: `calc(${pctW * col}% + 3px)`,
            width: `calc(${pctW}% - 6px)`,
            zIndex: 1,
          }}
          className="rounded-md border-l-4 border-l-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 overflow-hidden"
        >
          <div className="flex items-center gap-1 leading-none">
            <GraduationCap className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-foreground truncate">
              {event.name}
            </span>
          </div>
          {!isShort && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {event.startTime.slice(0, 5)}–{event.endTime.slice(0, 5)}
              {event.court ? ` · ${event.court}` : ""}
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          position: "absolute",
          top,
          height,
          left: `calc(${pctW * col}% + 3px)`,
          width: `calc(${pctW}% - 6px)`,
          zIndex: 1,
        }}
        className={cn(
          "rounded-md border-l-4 px-2 py-1 overflow-hidden",
          STATUS_STYLE[event.status]
        )}
      >
        <div className="flex items-center gap-1 leading-none">
          <User className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "text-[11px] font-semibold truncate",
              STATUS_TEXT[event.status]
            )}
          >
            {event.name}
          </span>
        </div>
        {!isShort && (
          <>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {event.startTime.slice(0, 5)}–{event.endTime.slice(0, 5)} · R$
              {event.price.toFixed(0)}
            </p>
            {event.status === "requested" && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: event.id, status: "confirmed" });
                  }}
                  className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline"
                >
                  <CheckCircle className="h-3 w-3" /> Confirmar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: event.id, status: "cancelled" });
                  }}
                  className="text-[10px] font-semibold text-destructive flex items-center gap-0.5 hover:underline"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </div>
            )}
            {event.status === "confirmed" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: event.id, status: "paid" });
                }}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 underline mt-1 font-semibold block"
              >
                Marcar Pago
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  const weekLabel = `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`;
  const dayLabel = format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const columns = viewMode === "week" ? filteredWeekDays.length : courts.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold font-brand">Agendamentos</h2>
          <p className="text-sm text-muted-foreground">
            Visualize reservas e horários das turmas
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setViewMode("week")}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Semana
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setViewMode("day")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Dia
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CalendarDays, color: "text-primary" },
          { label: "Pendentes", value: stats.requested, icon: Clock, color: "text-amber-500" },
          { label: "Confirmados", value: stats.confirmed, icon: CheckCircle, color: "text-blue-500" },
          { label: "Pagos", value: stats.paid, icon: DollarSign, color: "text-emerald-500" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={cn("h-5 w-5", s.color)} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {viewMode === "week" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4 -ml-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                title="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold capitalize">
            {viewMode === "week" ? weekLabel : dayLabel}
          </p>
          <Button
            variant="link"
            size="sm"
            className="text-xs h-auto p-0"
            onClick={() => setCurrentDate(new Date())}
          >
            Ir para hoje
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {viewMode === "week" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                title="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 -ml-3" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary/20 border-l-2 border-primary" />
          Turma fixa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/40 border-l-2 border-amber-400" />
          Solicitado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500" />
          Confirmado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 border-l-2 border-emerald-500" />
          Pago
        </span>
      </div>

      {/* Calendar */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        {/* Sticky column headers */}
        <div
          className="sticky top-0 z-20 bg-card border-b"
          style={{
            display: "grid",
            gridTemplateColumns: `${TIME_COL_W}px repeat(${columns}, 1fr)`,
          }}
        >
          {/* Corner cell */}
          <div className="border-r py-2" />

          {viewMode === "week"
            ? filteredWeekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r p-2 text-center select-none",
                    isToday(day) && "bg-primary/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground capitalize">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold leading-none mt-0.5",
                      isToday(day) && "text-primary"
                    )}
                  >
                    {format(day, "dd")}
                  </p>
                </div>
              ))
            : courts.map((court, i) => (
                <div
                  key={court.id}
                  className={cn(
                    "border-r p-3 text-center font-semibold text-sm",
                    i % 2 === 0 ? "text-primary" : "text-secondary-foreground"
                  )}
                >
                  {court.name}
                </div>
              ))}
        </div>

        {/* Scrollable time area */}
        <div className="overflow-y-auto" style={{ maxHeight: 580 }}>
          <div
            style={{
              position: "relative",
              height: totalHeight,
              minWidth: 700,
            }}
          >
            {/* Time labels */}
            {HOURS.map((hour, i) => (
              <div
                key={hour}
                style={{
                  position: "absolute",
                  top: i * HOUR_HEIGHT - 8,
                  left: 0,
                  width: TIME_COL_W,
                  paddingRight: 8,
                  textAlign: "right",
                }}
                className="text-[11px] text-muted-foreground select-none"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}

            {/* Full-hour lines */}
            {HOURS.map((_, i) => (
              <div
                key={`h-${i}`}
                style={{
                  position: "absolute",
                  top: i * HOUR_HEIGHT,
                  left: TIME_COL_W,
                  right: 0,
                  height: 1,
                }}
                className="bg-border/50"
              />
            ))}

            {/* Half-hour lines */}
            {HOURS.map((_, i) => (
              <div
                key={`hh-${i}`}
                style={{
                  position: "absolute",
                  top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                  left: TIME_COL_W,
                  right: 0,
                  height: 1,
                }}
                className="bg-border/25"
              />
            ))}

            {/* Day/Court columns */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: TIME_COL_W,
                right: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
              }}
            >
              {viewMode === "week"
                ? filteredWeekDays.map((day) => {
                    const events = getEventsForDay(day);
                    const laid = layoutEvents(events);
                    return (
                      <div
                        key={day.toISOString()}
                        style={{ position: "relative" }}
                        className={cn(
                          "border-l border-border/40",
                          isToday(day) && "bg-primary/[0.03]"
                        )}
                      >
                        {laid.map(({ event, col, totalCols }) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            col={col}
                            totalCols={totalCols}
                          />
                        ))}
                      </div>
                    );
                  })
                : courts.map((court) => {
                    const events = getEventsForCourt(court.id);
                    const laid = layoutEvents(events);
                    return (
                      <div
                        key={court.id}
                        style={{ position: "relative" }}
                        className="border-l border-border/40"
                      >
                        {laid.map(({ event, col, totalCols }) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            col={col}
                            totalCols={totalCols}
                          />
                        ))}
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
