import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  ChevronRight,
  MapPin,
  Phone,
  Loader2,
  ArrowLeft,
  Clock,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { formatPhoneMask, cleanPhone } from "@/lib/whatsapp";
import { Section, SectionLabel, SectionTitle } from "./Section";

const bookingSchema = z.object({
  requester_name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100),
  requester_phone: z.string().trim().min(10, "Telefone inválido").max(20),
});

type Court = {
  id: string;
  name: string;
  location: string | null;
  surface_type: string | null;
};

function CourtCard({
  court,
  selected,
  onClick,
  index,
}: {
  court: Court;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  const gradients = [
    "from-primary/20 to-primary/5",
    "from-secondary/20 to-secondary/5",
  ];
  const borders = ["border-primary/30", "border-secondary/30"];
  const rings = ["ring-primary", "ring-secondary"];
  const icons = ["text-primary", "text-secondary"];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        "relative w-full text-left rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer group hover:shadow-lg",
        `bg-gradient-to-br ${gradients[index % 2]}`,
        borders[index % 2],
        selected && `ring-2 ring-offset-2 ring-offset-background ${rings[index % 2]} shadow-lg`
      )}
    >
      {selected && (
        <span
          className={cn(
            "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
            index % 2 === 0 ? "bg-primary" : "bg-secondary"
          )}
        >
          ✓
        </span>
      )}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            index % 2 === 0 ? "bg-primary/15" : "bg-secondary/15"
          )}
        >
          <MapPin className={cn("h-6 w-6", icons[index % 2])} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-xl font-extrabold text-foreground mb-1">
            {court.name}
          </h3>
          {court.location && (
            <p className="text-sm text-muted-foreground truncate">
              {court.location}
            </p>
          )}
          {court.surface_type && (
            <span
              className={cn(
                "inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full",
                index % 2 === 0
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary/10 text-secondary"
              )}
            >
              {court.surface_type}
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "mt-4 flex items-center gap-1 text-xs font-semibold",
          icons[index % 2]
        )}
      >
        Selecionar esta quadra
        <ChevronRight className="h-3 w-3" />
      </div>
    </motion.button>
  );
}

export function CourtBookingSection() {
  const { data: businessHours } = useBusinessHours();
  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];
  const openHour = businessHours?.open_hour ?? 6;
  const closeHour = businessHours?.close_hour ?? 22;
  const TIME_SLOTS = Array.from({ length: closeHour - openHour }, (_, i) => {
    const h = i + openHour;
    return `${String(h).padStart(2, "0")}:00`;
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ requester_name: "", requester_phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);

  const { data: courts = [] } = useQuery({
    queryKey: ["public-courts-landing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Court[];
    },
  });

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { data: existingBookings = [] } = useQuery({
    queryKey: ["court-bookings-landing", selectedCourt?.id, dateStr],
    queryFn: async () => {
      if (!selectedCourt || !dateStr) return [];
      const { data, error } = await supabase
        .from("court_bookings")
        .select("start_time, status")
        .eq("court_id", selectedCourt.id)
        .eq("date", dateStr)
        .in("status", ["requested", "confirmed", "paid"]);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourt && !!dateStr,
  });

  const { data: classSessions = [] } = useQuery({
    queryKey: ["class-sessions-landing", selectedCourt?.id, dateStr],
    queryFn: async () => {
      if (!selectedCourt || !dateStr) return [];
      const { data, error } = await supabase
        .from("class_sessions")
        .select("id, classes!inner(court_id, start_time)")
        .eq("date", dateStr)
        .neq("status", "cancelled");
      if (error) throw error;
      return (data || []).filter(
        (s: any) => s.classes?.court_id === selectedCourt.id
      );
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

  const availableCount = TIME_SLOTS.filter(
    (s) => !unavailableSlots.has(s)
  ).length;

  const createBooking = useMutation({
    mutationFn: async () => {
      const rawPhone = cleanPhone(form.requester_phone);
      const validation = bookingSchema.safeParse({
        requester_name: form.requester_name,
        requester_phone: rawPhone,
      });
      if (!validation.success)
        throw new Error(validation.error.errors[0].message);
      if (!selectedCourt || !dateStr || !selectedSlot)
        throw new Error("Selecione quadra, data e horário");
      const startHour = parseInt(selectedSlot.split(":")[0]);
      const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;
      const { error } = await supabase.from("court_bookings").insert({
        court_id: selectedCourt.id,
        date: dateStr,
        start_time: selectedSlot,
        end_time: endTime,
        requester_name: validation.data.requester_name,
        requester_phone: rawPhone,
        price: 80,
        status: "requested",
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSelectCourt = (court: Court) => {
    setSelectedCourt(court);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(1);
    setSelectedCourt(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setForm({ requester_name: "", requester_phone: "" });
  };

  const stepLabels = ["Escolha a quadra", "Data e horário", "Confirmar"];

  return (
    <Section id="reservar-quadra" className="py-20 px-6 bg-card">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <SectionLabel>Aluguel de Quadras</SectionLabel>
          <SectionTitle>
            Reserve sua <span className="text-secondary">quadra online</span>
          </SectionTitle>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Escolha a quadra, selecione a data e o horário disponível. Em
            poucos cliques sua reserva está feita.
          </p>
        </div>

        {submitted ? (
          /* Success */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center bg-background rounded-2xl border border-border p-10"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-heading text-2xl font-extrabold text-foreground mb-2">
              Reserva solicitada!
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              <strong>{selectedCourt?.name}</strong> —{" "}
              {selectedDate && format(selectedDate, "dd/MM/yyyy")} às{" "}
              {selectedSlot}
              <br />
              Entraremos em contato para confirmar.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-bold text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Fazer outra reserva
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="bg-background rounded-2xl border border-border overflow-hidden">
            {/* Step indicator */}
            <div className="flex border-b border-border">
              {stepLabels.map((label, i) => {
                const s = i + 1;
                const isActive = step === s;
                const isDone = step > s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (isDone) setStep(s as 1 | 2 | 3);
                    }}
                    disabled={!isDone}
                    className={cn(
                      "flex-1 py-4 flex flex-col items-center gap-1 text-xs font-semibold transition-colors",
                      isActive && "bg-secondary/5 text-secondary border-b-2 border-secondary",
                      isDone && "text-muted-foreground cursor-pointer hover:bg-muted/40",
                      !isActive && !isDone && "text-muted-foreground/40 cursor-default"
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                        isActive && "bg-secondary text-white",
                        isDone && "bg-muted text-foreground",
                        !isActive && !isDone && "bg-muted/40 text-muted-foreground/40"
                      )}
                    >
                      {isDone ? "✓" : s}
                    </span>
                    <span className="hidden sm:block">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Choose Court */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h3 className="font-heading text-xl font-bold text-foreground mb-6">
                      Qual quadra você prefere?
                    </h3>
                    {courts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhuma quadra disponível no momento.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {courts.map((court, i) => (
                          <CourtCard
                            key={court.id}
                            court={court}
                            selected={selectedCourt?.id === court.id}
                            onClick={() => handleSelectCourt(court)}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </button>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {selectedCourt?.name}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Calendar */}
                      <div>
                        <h3 className="font-heading text-base font-bold text-foreground mb-4">
                          Selecione a data
                        </h3>
                        <div className="rounded-xl border border-border bg-card p-2 flex justify-center">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => {
                              setSelectedDate(d);
                              setSelectedSlot(null);
                            }}
                            disabled={(date) =>
                              isBefore(date, today) ||
                              isBefore(maxDate, date) ||
                              !openDays.includes(date.getDay())
                            }
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </div>
                      </div>

                      {/* Time slots */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Horários disponíveis
                          </h3>
                          {selectedDate && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                              {availableCount} disponíveis
                            </span>
                          )}
                        </div>

                        {!selectedDate ? (
                          <div className="rounded-xl border border-dashed border-border flex items-center justify-center h-48 text-sm text-muted-foreground">
                            Selecione uma data primeiro
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                            {TIME_SLOTS.map((slot) => {
                              const isUnavailable = unavailableSlots.has(slot);
                              const isSelected = selectedSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  disabled={isUnavailable}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={cn(
                                    "px-2 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                                    isSelected &&
                                      "bg-secondary text-white border-secondary shadow-md",
                                    !isSelected &&
                                      !isUnavailable &&
                                      "bg-background border-border text-foreground hover:border-secondary hover:text-secondary",
                                    isUnavailable &&
                                      "bg-muted/30 border-border/30 text-muted-foreground/40 line-through cursor-not-allowed"
                                  )}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {selectedSlot && (
                          <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setStep(3)}
                            className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-br from-secondary to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                          >
                            Continuar
                            <ChevronRight className="h-4 w-4" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Contact + Confirm */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className="max-w-md mx-auto space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </button>
                      <h3 className="font-heading text-xl font-bold text-foreground">
                        Confirmar reserva
                      </h3>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl bg-secondary/5 border border-secondary/20 p-5 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-1">
                        Resumo
                      </p>
                      {[
                        { label: "Quadra", value: selectedCourt?.name },
                        {
                          label: "Data",
                          value:
                            selectedDate &&
                            format(selectedDate, "EEEE, dd/MM/yyyy", {
                              locale: ptBR,
                            }),
                        },
                        {
                          label: "Horário",
                          value: selectedSlot
                            ? `${selectedSlot} – ${String(parseInt(selectedSlot) + 1).padStart(2, "0")}:00`
                            : "",
                        },
                        { label: "Valor", value: "R$ 80,00" },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-muted-foreground">
                            {label}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-semibold capitalize",
                              label === "Valor" && "text-secondary font-bold"
                            )}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Nome completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.requester_name}
                          onChange={(e) =>
                            setForm({ ...form, requester_name: e.target.value })
                          }
                          placeholder="Seu nome"
                          maxLength={100}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          WhatsApp *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="tel"
                            required
                            value={form.requester_phone}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                requester_phone: formatPhoneMask(e.target.value),
                              })
                            }
                            placeholder="(11) 99999-9999"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => createBooking.mutate()}
                        disabled={
                          createBooking.isPending ||
                          !form.requester_name.trim() ||
                          cleanPhone(form.requester_phone).length < 10
                        }
                        className="w-full py-4 rounded-xl bg-gradient-to-br from-secondary to-orange-600 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                      >
                        {createBooking.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            Solicitar Reserva
                            <ChevronRight className="h-5 w-5" />
                          </>
                        )}
                      </button>
                      <p className="text-xs text-muted-foreground text-center">
                        Você receberá a confirmação pelo WhatsApp
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
