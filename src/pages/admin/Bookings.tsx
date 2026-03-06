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

export default function Bookings() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: businessHours } = useBusinessHours();

  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];
  const openHour = businessHours?.open_hour ?? 6;
  const closeHour = businessHours?.close_hour ?? 22;
  const HOURS = Array.from({ length: closeHour - openHour }, (_, i) => i + openHour);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dateRange = {
    from: format(weekStart, "yyyy-MM-dd"),
    to: format(weekEnd, "yyyy-MM-dd"),
  };

  // Fetch bookings for the week
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings-week", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_bookings")
        .select("*, courts(name)")
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
        .select("*, courts(name)")
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
      queryClient.invalidateQueries({ queryKey: ["admin-bookings-week"] });
      toast.success("Status atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Build events for each day
  const dayEvents = useMemo(() => {
    return weekDays.map((day) => {
      const dayOfWeek = getDay(day); // 0=Sun ... 6=Sat
      const dateStr = format(day, "yyyy-MM-dd");

      const dayClasses = classes
        .filter((c) => c.day_of_week.includes(dayOfWeek))
        .map((c) => ({
          type: "class" as const,
          id: c.id,
          name: c.name,
          court: (c as any).courts?.name || "",
          startTime: c.start_time,
          endTime: c.end_time,
        }));

      const dayBookings = bookings
        .filter((b) => b.date === dateStr)
        .map((b) => ({
          type: "booking" as const,
          id: b.id,
          name: b.requester_name,
          court: (b as any).courts?.name || "",
          startTime: b.start_time,
          endTime: b.end_time,
          status: b.status as BookingStatus,
          phone: b.requester_phone,
          price: Number(b.price),
        }));

      return { day, dayOfWeek, events: [...dayClasses, ...dayBookings] };
    });
  }, [weekDays, classes, bookings]);

  const stats = {
    total: bookings.length,
    requested: bookings.filter((b) => b.status === "requested").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    paid: bookings.filter((b) => b.status === "paid").length,
  };

  const weekLabel = `${format(weekStart, "dd MMM", { locale: ptBR })} — ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}
        >
          Agendamentos
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualize reservas e horários das turmas no calendário semanal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CalendarDays },
          { label: "Pendentes", value: stats.requested, icon: Clock },
          { label: "Confirmados", value: stats.confirmed, icon: CheckCircle },
          { label: "Pagos", value: stats.paid, icon: CheckCircle },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} title="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-3" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} title="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{weekLabel}</p>
          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setCurrentDate(new Date())}>
            Ir para hoje
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} title="Próxima semana">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} title="Próximo mês">
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-3" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary/30 border border-primary" />
          Turma fixa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-warning/30 border border-warning" />
          Solicitado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/30 border border-success" />
          Confirmado / Pago
        </span>
      </div>

      {/* Weekly Calendar Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className={cn("grid min-w-[700px] overflow-x-auto", `grid-cols-[auto_repeat(${filteredWeekDays.length},1fr)]`)}>
            {/* Header row */}
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
                <p
                  className={cn(
                    "text-lg font-bold",
                    isToday(day) && "text-primary"
                  )}
                >
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
                {dayEvents.map(({ day, events }) => {
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
                      {cellEvents.map((event) =>
                        event.type === "class" ? (
                          <div
                            key={event.id}
                            className="rounded border border-primary/40 bg-primary/10 px-1.5 py-1 mb-0.5 text-[10px] leading-tight"
                          >
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 text-primary shrink-0" />
                              <span className="font-semibold truncate text-foreground">
                                {event.name}
                              </span>
                            </div>
                            <p className="text-muted-foreground truncate">
                              {event.court} · {event.startTime?.slice(0, 5)}-{event.endTime?.slice(0, 5)}
                            </p>
                          </div>
                        ) : (
                          <div
                            key={event.id}
                            className={cn(
                              "rounded border px-1.5 py-1 mb-0.5 text-[10px] leading-tight",
                              STATUS_COLORS[event.status]
                            )}
                          >
                            <p className="font-semibold truncate text-foreground">{event.name}</p>
                            <p className="text-muted-foreground truncate">
                              {event.court} · {event.startTime?.slice(0, 5)}-{event.endTime?.slice(0, 5)}
                            </p>
                            <p className="text-muted-foreground">
                              R$ {event.price.toFixed(2)}
                            </p>
                            {event.status === "requested" && (
                              <div className="flex gap-1 mt-0.5">
                                <button
                                  className="text-primary hover:text-primary/80"
                                  title="Confirmar"
                                  onClick={() => updateStatus.mutate({ id: event.id, status: "confirmed" })}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="text-destructive hover:text-destructive/80"
                                  title="Cancelar"
                                  onClick={() => updateStatus.mutate({ id: event.id, status: "cancelled" })}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                            {event.status === "confirmed" && (
                              <button
                                className="text-[9px] text-primary underline mt-0.5"
                                onClick={() => updateStatus.mutate({ id: event.id, status: "paid" })}
                              >
                                Marcar Pago
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
