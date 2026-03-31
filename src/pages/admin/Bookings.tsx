import { useState, useMemo } from "react";
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
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addDays,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Phone,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { useBusinessHours } from "@/hooks/useBusinessHours";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_COLORS: Record<BookingStatus, string> = {
  requested: "bg-warning/20 border-warning text-warning-foreground",
  confirmed: "bg-primary/15 border-primary text-primary",
  paid: "bg-success/15 border-success text-success",
  cancelled: "bg-destructive/15 border-destructive text-destructive",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Solicitado",
  confirmed: "Confirmado",
  paid: "Pago",
  cancelled: "Cancelado",
};

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
      status: BookingStatus;
      phone: string;
      price: number;
    };

export default function Bookings() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const { data: businessHours } = useBusinessHours();

  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];
  const openHour = businessHours?.open_hour ?? 6;
  const closeHour = businessHours?.close_hour ?? 22;
  const HOURS = Array.from({ length: closeHour - openHour }, (_, i) => i + openHour);

  // Week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dateRange = {
    from: format(viewMode === "day" ? currentDate : weekStart, "yyyy-MM-dd"),
    to: format(viewMode === "day" ? currentDate : weekEnd, "yyyy-MM-dd"),
  };

  // Fetch courts
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

  // Fetch bookings
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

  // Fetch active classes
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

  // ── Week view helpers ─────────────────────────────────────────────────────
  const filteredWeekDays = weekDays.filter((day) => openDays.includes(getDay(day)));

  const weekDayEvents = useMemo(() => {
    return filteredWeekDays.map((day) => {
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
          status: b.status as BookingStatus,
          phone: b.requester_phone,
          price: Number(b.price),
        }));

      return { day, dayOfWeek, events: [...dayClasses, ...dayBookings] };
    });
  }, [filteredWeekDays, classes, bookings]);

  // ── Day view helpers ──────────────────────────────────────────────────────
  const dayDateStr = format(currentDate, "yyyy-MM-dd");
  const dayOfWeek = getDay(currentDate);

  const dayEvents = useMemo((): Record<string, CalendarEvent[]> => {
    const result: Record<string, CalendarEvent[]> = {};
    courts.forEach((court) => {
      const classEvents: CalendarEvent[] = classes
        .filter(
          (c) =>
            (c as any).courts?.id === court.id &&
            c.day_of_week.includes(dayOfWeek)
        )
        .map((c) => ({
          type: "class" as const,
          id: c.id,
          name: c.name,
          court: court.name,
          courtId: court.id,
          startTime: c.start_time,
          endTime: c.end_time,
        }));

      const bookingEvents: CalendarEvent[] = bookings
        .filter(
          (b) => b.date === dayDateStr && (b as any).courts?.id === court.id
        )
        .map((b) => ({
          type: "booking" as const,
          id: b.id,
          name: b.requester_name,
          court: court.name,
          courtId: court.id,
          startTime: b.start_time,
          endTime: b.end_time,
          status: b.status as BookingStatus,
          phone: b.requester_phone,
          price: Number(b.price),
        }));

      result[court.id] = [...classEvents, ...bookingEvents];
    });
    return result;
  }, [courts, classes, bookings, dayDateStr, dayOfWeek]);

  const weekLabel = `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`;
  const dayLabel = format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  function EventBlock({ event }: { event: CalendarEvent }) {
    if (event.type === "class") {
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5 mb-1 text-[11px] leading-tight">
          <div className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3 text-primary shrink-0" />
            <span className="font-semibold truncate text-foreground">{event.name}</span>
          </div>
          <p className="text-muted-foreground truncate">
            {event.startTime?.slice(0, 5)}–{event.endTime?.slice(0, 5)}
          </p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "rounded-lg border px-2 py-1.5 mb-1 text-[11px] leading-tight",
          STATUS_COLORS[event.status]
        )}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <User className="h-3 w-3 shrink-0" />
          <p className="font-semibold truncate text-foreground">{event.name}</p>
        </div>
        <p className="text-muted-foreground">
          {event.startTime?.slice(0, 5)}–{event.endTime?.slice(0, 5)} · R${event.price.toFixed(0)}
        </p>
        {event.status === "requested" && (
          <div className="flex gap-1 mt-1">
            <button
              title="Confirmar"
              onClick={() => updateStatus.mutate({ id: event.id, status: "confirmed" })}
              className="flex items-center gap-0.5 text-primary hover:text-primary/80 font-semibold"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Confirmar
            </button>
            <button
              title="Cancelar"
              onClick={() => updateStatus.mutate({ id: event.id, status: "cancelled" })}
              className="flex items-center gap-0.5 text-destructive hover:text-destructive/80 font-semibold ml-1"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {event.status === "confirmed" && (
          <button
            className="text-[10px] text-primary underline mt-1 font-semibold"
            onClick={() => updateStatus.mutate({ id: event.id, status: "paid" })}
          >
            Marcar Pago
          </button>
        )}
      </div>
    );
  }

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
        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setViewMode("week")}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Semana
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setViewMode("day")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Dia
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CalendarDays, color: "text-primary" },
          { label: "Pendentes", value: stats.requested, icon: Clock, color: "text-warning" },
          { label: "Confirmados", value: stats.confirmed, icon: CheckCircle, color: "text-primary" },
          { label: "Pagos", value: stats.paid, icon: DollarSign, color: "text-success" },
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
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} title="Mês anterior">
                <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-3" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} title="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))} title="Dia anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold capitalize">
            {viewMode === "week" ? weekLabel : dayLabel}
          </p>
          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setCurrentDate(new Date())}>
            Ir para hoje
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {viewMode === "week" ? (
            <>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} title="Próxima semana">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} title="Próximo mês">
                <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-3" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))} title="Próximo dia">
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary/30 border border-primary" /> Turma fixa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-warning/30 border border-warning" /> Solicitado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary/15 border border-primary" /> Confirmado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/15 border border-success" /> Pago
        </span>
      </div>

      {/* ── WEEK VIEW ────────────────────────────────────────────────────────── */}
      {viewMode === "week" && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div
              className={cn(
                "grid min-w-[700px] overflow-x-auto",
                `grid-cols-[auto_repeat(${filteredWeekDays.length},1fr)]`
              )}
            >
              {/* Header */}
              <div className="sticky left-0 bg-card z-10 border-b border-r p-2" />
              {filteredWeekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-b border-r p-2 text-center",
                    isToday(day) && "bg-primary/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground capitalize">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={cn("text-lg font-bold", isToday(day) && "text-primary")}>
                    {format(day, "dd")}
                  </p>
                </div>
              ))}

              {/* Time rows */}
              {HOURS.map((hour) => (
                <>
                  <div
                    key={`hour-${hour}`}
                    className="sticky left-0 bg-card z-10 border-b border-r px-2 py-3 text-xs text-muted-foreground text-right min-w-[50px]"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {weekDayEvents.map(({ day, events }) => {
                    const cellEvents = events.filter((e) => {
                      const startHour = parseInt(e.startTime?.slice(0, 2) || "0", 10);
                      return startHour === hour;
                    });
                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          "border-b border-r p-0.5 min-h-[56px] relative",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        {cellEvents.map((event) => (
                          <EventBlock key={event.id} event={event} />
                        ))}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── DAY VIEW ─────────────────────────────────────────────────────────── */}
      {viewMode === "day" && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {courts.length === 0 ? (
              <p className="text-muted-foreground text-center py-12 text-sm">
                Nenhuma quadra ativa cadastrada.
              </p>
            ) : (
              <div
                className="overflow-x-auto"
                style={{ minWidth: `${60 + courts.length * 200}px` }}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `60px repeat(${courts.length}, 1fr)`,
                  }}
                >
                  {/* Header row — courts as columns */}
                  <div className="sticky left-0 bg-card z-10 border-b border-r" />
                  {courts.map((court, i) => {
                    const colors = [
                      "bg-primary/10 text-primary border-primary/20",
                      "bg-secondary/10 text-secondary border-secondary/20",
                    ];
                    return (
                      <div
                        key={court.id}
                        className={cn(
                          "border-b border-r p-3 text-center font-bold text-sm",
                          colors[i % 2]
                        )}
                      >
                        {court.name}
                        <div className="text-xs font-normal mt-0.5 opacity-70">
                          {(dayEvents[court.id] || []).length} evento(s)
                        </div>
                      </div>
                    );
                  })}

                  {/* Time rows */}
                  {HOURS.map((hour) => (
                    <>
                      <div
                        key={`day-hour-${hour}`}
                        className="sticky left-0 bg-card z-10 border-b border-r px-2 py-3 text-xs text-muted-foreground text-right"
                      >
                        {String(hour).padStart(2, "0")}:00
                      </div>
                      {courts.map((court) => {
                        const cellEvents = (dayEvents[court.id] || []).filter(
                          (e) => parseInt(e.startTime?.slice(0, 2) || "0", 10) === hour
                        );
                        const isEmpty = cellEvents.length === 0;
                        return (
                          <div
                            key={`${court.id}-${hour}`}
                            className={cn(
                              "border-b border-r p-1 min-h-[60px]",
                              isEmpty && "bg-muted/10"
                            )}
                          >
                            {cellEvents.map((event) => (
                              <EventBlock key={event.id} event={event} />
                            ))}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
