import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Clock, ArrowLeft, CheckCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useBusinessHours } from "@/hooks/useBusinessHours";

const bookingSchema = z.object({
  requester_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  requester_phone: z.string().trim().min(10, "Telefone inválido").max(20),
});

export default function CourtBooking() {
  const { data: businessHours } = useBusinessHours();
  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];
  const openHour = businessHours?.open_hour ?? 6;
  const closeHour = businessHours?.close_hour ?? 22;
  const TIME_SLOTS = Array.from({ length: closeHour - openHour }, (_, i) => {
    const h = i + openHour;
    return `${String(h).padStart(2, "0")}:00`;
  });

  const [step, setStep] = useState(1);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ requester_name: "", requester_phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data: courts = [] } = useQuery({
    queryKey: ["public-courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { data: existingBookings = [] } = useQuery({
    queryKey: ["court-bookings", selectedCourt, dateStr],
    queryFn: async () => {
      if (!selectedCourt || !dateStr) return [];
      const { data, error } = await supabase
        .from("court_bookings")
        .select("start_time, end_time, status")
        .eq("court_id", selectedCourt)
        .eq("date", dateStr)
        .in("status", ["requested", "confirmed", "paid"]);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourt && !!dateStr,
  });

  const { data: classSessions = [] } = useQuery({
    queryKey: ["class-sessions-block", selectedCourt, dateStr],
    queryFn: async () => {
      if (!selectedCourt || !dateStr) return [];
      const { data, error } = await supabase
        .from("class_sessions")
        .select("id, class_id, classes!inner(court_id, start_time, end_time)")
        .eq("date", dateStr)
        .neq("status", "cancelled");
      if (error) throw error;
      // Filter by court
      return (data || []).filter((s: any) => s.classes?.court_id === selectedCourt);
    },
    enabled: !!selectedCourt && !!dateStr,
  });

  const unavailableSlots = useMemo(() => {
    const blocked = new Set<string>();
    existingBookings.forEach((b) => {
      const start = b.start_time?.slice(0, 5);
      if (start) blocked.add(start);
    });
    classSessions.forEach((s: any) => {
      const start = s.classes?.start_time?.slice(0, 5);
      if (start) blocked.add(start);
    });
    return blocked;
  }, [existingBookings, classSessions]);

  const createBooking = useMutation({
    mutationFn: async () => {
      const validation = bookingSchema.safeParse(form);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      if (!selectedCourt || !dateStr || !selectedSlot) {
        throw new Error("Selecione quadra, data e horário");
      }
      const startHour = parseInt(selectedSlot.split(":")[0]);
      const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;

      const { error } = await supabase.from("court_bookings").insert({
        court_id: selectedCourt,
        date: dateStr,
        start_time: selectedSlot,
        end_time: endTime,
        requester_name: validation.data.requester_name,
        requester_phone: validation.data.requester_phone,
        price: 80,
        status: "requested",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCourtData = courts.find((c) => c.id === selectedCourt);
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground font-heading">
              Reserva Solicitada!
            </h2>
            <p className="text-muted-foreground">
              Sua solicitação de reserva para <strong>{selectedCourtData?.name}</strong> no dia{" "}
              <strong>{selectedDate && format(selectedDate, "dd/MM/yyyy")}</strong> às{" "}
              <strong>{selectedSlot}</strong> foi recebida. Entraremos em contato para confirmar.
            </p>
            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={() => { setSubmitted(false); setStep(1); setSelectedCourt(null); setSelectedDate(undefined); setSelectedSlot(null); setForm({ requester_name: "", requester_phone: "" }); }}>
                Nova Reserva
              </Button>
              <Button onClick={() => window.location.href = "/landing"}>
                Voltar ao Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = "/landing"}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold font-heading">
              Reservar Quadra
            </h1>
            <p className="text-xs text-muted-foreground">Escolha quadra, data e horário</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {s}
              </div>
              {s < 3 && <div className={cn("w-12 h-0.5", step > s ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Court */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Escolha a Quadra</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {courts.map((court) => (
                <Card
                  key={court.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedCourt === court.id && "ring-2 ring-primary"
                  )}
                  onClick={() => { setSelectedCourt(court.id); setStep(2); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{court.name}</h3>
                        {court.location && (
                          <p className="text-sm text-muted-foreground">{court.location}</p>
                        )}
                        {court.surface_type && (
                          <Badge variant="secondary" className="mt-1 text-xs">{court.surface_type}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {courts.length === 0 && (
                <p className="text-muted-foreground col-span-2 text-center py-8">Nenhuma quadra disponível no momento.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Date and Time */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <h2 className="text-xl font-bold text-foreground">Data e Horário</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Selecione a Data</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
                    disabled={(date) =>
                      isBefore(date, today) ||
                      isBefore(maxDate, date) ||
                      !openDays.includes(date.getDay())
                    }
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Horários Disponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedDate ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Selecione uma data primeiro</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isUnavailable = unavailableSlots.has(slot);
                        return (
                          <Button
                            key={slot}
                            variant={selectedSlot === slot ? "default" : "outline"}
                            size="sm"
                            disabled={isUnavailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "text-sm",
                              isUnavailable && "opacity-40 line-through"
                            )}
                          >
                            {slot}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {selectedSlot && (
                    <Button className="w-full mt-4" onClick={() => setStep(3)}>
                      Continuar
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <h2 className="text-xl font-bold text-foreground">Seus Dados</h2>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quadra</span>
                  <span className="font-medium">{selectedCourtData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{selectedDate && format(selectedDate, "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium">{selectedSlot} - {selectedSlot && `${String(parseInt(selectedSlot.split(":")[0]) + 1).padStart(2, "0")}:00`}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-primary">R$ 80,00</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input
                    value={form.requester_name}
                    onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                    placeholder="Seu nome"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone (WhatsApp) *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.requester_phone}
                      onChange={(e) => setForm({ ...form, requester_phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      maxLength={20}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createBooking.mutate()}
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending ? "Enviando..." : "Solicitar Reserva"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Você receberá a confirmação por WhatsApp
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
