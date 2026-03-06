import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarDays, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_MAP: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Solicitado", variant: "outline" },
  confirmed: { label: "Confirmado", variant: "default" },
  paid: { label: "Pago", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Bookings() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-bookings", statusFilter, dateFilter ? format(dateFilter, "yyyy-MM-dd") : null],
    queryFn: async () => {
      let query = supabase
        .from("court_bookings")
        .select("*, courts(name)")
        .order("date", { ascending: false })
        .order("start_time", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as BookingStatus);
      }
      if (dateFilter) {
        query = query.eq("date", format(dateFilter, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
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
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>
          Agendamentos
        </h2>
        <p className="text-sm text-muted-foreground">Gerencie as reservas de quadras</p>
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
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="requested">Solicitados</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(!dateFilter && "text-muted-foreground")}>
              <CalendarDays className="h-4 w-4 mr-2" />
              {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Filtrar por data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter(undefined)}>
            Limpar data
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quadra</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum agendamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => {
                  const statusInfo = STATUS_MAP[booking.status as BookingStatus];
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{(booking as any).courts?.name || "—"}</TableCell>
                      <TableCell>{format(new Date(booking.date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</TableCell>
                      <TableCell>{booking.requester_name}</TableCell>
                      <TableCell>{booking.requester_phone}</TableCell>
                      <TableCell>R$ {Number(booking.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo?.variant || "outline"}>
                          {statusInfo?.label || booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {booking.status === "requested" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Confirmar"
                                onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })}
                              >
                                <CheckCircle className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancelar"
                                onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus.mutate({ id: booking.id, status: "paid" })}
                            >
                              Marcar Pago
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
