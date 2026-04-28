import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  DollarSign,
  CalendarDays,
  Clock,
  Undo2,
  Plus,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type BookingStatus = Database["public"]["Enums"]["booking_status"];

type Booking = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  price: number | null;
  requester_name: string | null;
  requester_phone: string | null;
  booking_type: string | null;
  courts: { name: string } | null;
};

type FilterStatus = "all" | BookingStatus;
type FilterType = "all" | "rental" | "day_use";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_CONFIG: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Solicitado", variant: "outline" },
  confirmed:  { label: "Confirmado", variant: "secondary" },
  paid:       { label: "Pago", variant: "default" },
  cancelled:  { label: "Cancelado", variant: "destructive" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function BookingsTable() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { data: rawBookings = [], isFetching } = useQuery({
    queryKey: ["bookings-table", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_bookings")
        .select("id, date, start_time, end_time, status, price, requester_name, requester_phone, booking_type, courts(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Booking[];
    },
  });

  const { data: sysConfig } = useQuery({
    queryKey: ["system-config-booking-prices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["court_rental_price", "day_use_price"]);
      return Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
    },
    staleTime: 5 * 60 * 1000,
  });

  // --- Nova Reserva ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newCourtId, setNewCourtId] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newSlot, setNewSlot] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newType, setNewType] = useState<"rental" | "day_use">("rental");
  const [newPrice, setNewPrice] = useState("");

  const { data: courts = [] } = useQuery({
    queryKey: ["admin-courts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: availableSlots = [], isFetching: slotsFetching } = useQuery({
    queryKey: ["admin-available-slots", newCourtId, newDate],
    queryFn: async () => {
      if (!newCourtId || !newDate) return [];
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/court-availability?court_id=${newCourtId}&date=${newDate}`,
        { headers: { apikey: SUPABASE_KEY } },
      );
      const json = await res.json();
      return (json.available_slots ?? []) as { start: string; end: string }[];
    },
    enabled: !!newCourtId && !!newDate,
    staleTime: 0,
  });

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!newCourtId || !newDate || !newSlot || !newName.trim() || !newPhone.trim()) {
        throw new Error("Preencha todos os campos obrigatórios");
      }
      const slot = availableSlots.find((s) => s.start === newSlot);
      if (!slot) throw new Error("Horário inválido");
      const defaultPrice = newType === "day_use"
        ? Number(sysConfig?.day_use_price || 0)
        : Number(sysConfig?.court_rental_price || 0);
      const { error, data } = await supabase.functions.invoke("court-availability", {
        method: "POST",
        body: {
          court_id: newCourtId,
          date: newDate,
          start_time: slot.start,
          end_time: slot.end,
          requester_name: newName.trim(),
          requester_phone: newPhone.trim(),
          booking_type: newType,
          price: newPrice ? Number(newPrice) : defaultPrice,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Reserva criada! WhatsApp enviado ao cliente.");
      queryClient.invalidateQueries({ queryKey: ["bookings-table"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-rich"] });
      setSheetOpen(false);
      setNewCourtId(""); setNewDate(format(new Date(), "yyyy-MM-dd"));
      setNewSlot(""); setNewName(""); setNewPhone(""); setNewType("rental"); setNewPrice("");
    },
    onError: (e: Error) => toast.error(e.message),
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
      queryClient.invalidateQueries({ queryKey: ["bookings-table"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-rich"] });
      toast.success("Status atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resolvePrice(b: Booking): number {
    const stored = Number(b.price);
    if (stored > 0) return stored;
    if (b.booking_type === "day_use") return Number(sysConfig?.day_use_price || 0);
    return Number(sysConfig?.court_rental_price || 0);
  }

  const filtered = useMemo(() => {
    return rawBookings.filter((b) => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (filterType !== "all" && b.booking_type !== filterType) return false;
      return true;
    });
  }, [rawBookings, filterStatus, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Summary counts
  const summary = useMemo(() => {
    const counts = { total: filtered.length, paid: 0, confirmed: 0, requested: 0, cancelled: 0, paidAmount: 0 };
    for (const b of filtered) {
      counts[b.status as keyof typeof counts] = (counts[b.status as keyof typeof counts] as number) + 1;
      if (b.status === "paid") counts.paidAmount += resolvePrice(b);
    }
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sysConfig]);

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });

  function handlePageSizeChange(val: string) {
    setPageSize(Number(val));
    setPage(1);
  }

  function handleFilterStatus(val: string) {
    setFilterStatus(val as FilterStatus);
    setPage(1);
  }

  function handleFilterType(val: string) {
    setFilterType(val as FilterType);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-brand">Lista de Agendamentos</h2>
          <p className="text-sm text-muted-foreground">Tabela por horário com controle de pagamento</p>
        </div>
        <Button onClick={() => setSheetOpen(true)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Nova Reserva
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: summary.total, icon: CalendarDays, color: "text-primary" },
          { label: "Confirmados", value: summary.confirmed, icon: Clock, color: "text-blue-500" },
          { label: "Pagos", value: summary.paid, icon: DollarSign, color: "text-emerald-500" },
          { label: "Recebido", value: formatCurrency(summary.paidAmount), icon: DollarSign, color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setCurrentDate(subMonths(currentDate, 1)); setPage(1); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize min-w-[130px] text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setCurrentDate(addMonths(currentDate, 1)); setPage(1); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={handleFilterStatus}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="requested">Solicitado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={handleFilterType}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="rental">Aluguel</SelectItem>
              <SelectItem value="day_use">Day Use</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n} / pág.</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Horário</th>
                <th className="text-left px-4 py-3 font-medium">Quadra</th>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Telefone</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isFetching && paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum agendamento encontrado.
                  </td>
                </tr>
              )}
              {paginated.map((b) => {
                const price = resolvePrice(b);
                const s = STATUS_CONFIG[b.status];
                const parsedDate = parseISO(b.date);
                return (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {format(parsedDate, "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3">{b.courts?.name || "—"}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate font-medium">{b.requester_name || "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{b.requester_phone || "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {b.booking_type === "day_use" ? "Day Use" : "Aluguel"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === "requested" && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 px-2"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Confirmar
                          </Button>
                        )}
                        {(b.status === "confirmed" || b.status === "requested") && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 px-2"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "paid" })}
                            disabled={updateStatus.isPending}
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1" />Confirmar pagamento
                          </Button>
                        )}
                        {b.status === "paid" && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-amber-600 px-2"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}
                            disabled={updateStatus.isPending}
                          >
                            <Undo2 className="h-3.5 w-3.5 mr-1" />Desfazer
                          </Button>
                        )}
                        {b.status !== "cancelled" && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive px-0"
                            onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}
                            disabled={updateStatus.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm text-muted-foreground">
          <span>
            {filtered.length === 0
              ? "Nenhum resultado"
              : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} de ${filtered.length}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">{safePage} / {totalPages}</span>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova Reserva</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Quadra *</Label>
              <Select value={newCourtId} onValueChange={(v) => { setNewCourtId(v); setNewSlot(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a quadra" /></SelectTrigger>
                <SelectContent>
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Data *</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); setNewSlot(""); }}
              />
            </div>

            <div className="space-y-1">
              <Label>Horário *</Label>
              <Select
                value={newSlot}
                onValueChange={setNewSlot}
                disabled={!newCourtId || !newDate || slotsFetching}
              >
                <SelectTrigger>
                  <SelectValue placeholder={slotsFetching ? "Buscando horários..." : "Selecione o horário"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.length === 0 && !slotsFetching && (
                    <SelectItem value="__none__" disabled>Sem horários disponíveis</SelectItem>
                  )}
                  {availableSlots.map((s) => (
                    <SelectItem key={s.start} value={s.start}>
                      {s.start} – {s.end}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Nome do cliente *</Label>
              <Input placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Telefone (WhatsApp) *</Label>
              <Input placeholder="(11) 99999-9999" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as "rental" | "day_use")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Aluguel de Quadra</SelectItem>
                  <SelectItem value="day_use">Day Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Valor (R$) — opcional</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  newType === "day_use"
                    ? sysConfig?.day_use_price || "0"
                    : sysConfig?.court_rental_price || "0"
                }
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Deixe em branco para usar o preço padrão</p>
            </div>
          </div>

          <SheetFooter>
            <Button
              className="w-full"
              onClick={() => createBooking.mutate()}
              disabled={createBooking.isPending}
            >
              {createBooking.isPending ? "Agendando..." : "Agendar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
