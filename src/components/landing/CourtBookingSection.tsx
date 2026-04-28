import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { formatPhoneMask, cleanPhone } from "@/lib/whatsapp";
import { Section, SectionLabel, SectionTitle } from "./Section";

const bookingSchema = z.object({
  requester_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  requester_phone: z.string().trim().min(10, "Telefone inválido").max(20),
});

type Court = {
  id: string;
  name: string;
  location: string | null;
  surface_type: string | null;
  slot_offset_minutes: number | null;
};

type ExistingBooking = {
  start_time: string | null;
  end_time: string | null;
  status: string;
};

type ClassSessionRow = {
  id: string;
  classes: {
    court_id: string;
    start_time: string;
    end_time: string;
  } | null;
};

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function slotLabel(slot: string): string {
  return `${slot} – ${addMinutes(slot, 60)}`;
}

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
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08 }}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-[24px] border p-6 text-left transition-all duration-300 hover:-translate-y-1",
        selected
          ? "border-[#F97316]/40 bg-gradient-to-b from-[#F97316]/8 to-[#F97316]/3 shadow-[0_8px_32px_rgba(249,115,22,0.14)]"
          : "border-[#E8DECE] bg-white hover:border-[#DDD0B8] hover:shadow-[0_4px_20px_rgba(90,60,20,0.08)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B8770]">
            Quadra 0{index + 1}
          </p>
          <h3 className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-[#1A1208]">
            {court.name}
          </h3>
        </div>
        <span className="text-3xl font-extrabold leading-none tracking-wide text-[#DDD0B8]">
          0{index + 1}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-2 text-sm text-[#6B5740]">
        {court.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#F97316]" />
            <span>{court.location}</span>
          </div>
        )}
        {court.surface_type && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#F97316]" />
            <span>{court.surface_type}</span>
          </div>
        )}
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#DDD0B8] bg-[#FAF7F2] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B5740] transition group-hover:border-[#F97316]/30 group-hover:bg-[#F97316]/6 group-hover:text-[#C2550A]">
        Selecionar quadra
        <ChevronRight className="h-4 w-4 text-[#F97316]" />
      </div>
    </motion.button>
  );
}

export function CourtBookingSection() {
  const { data: businessHours } = useBusinessHours();
  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];
  const openHour = businessHours?.open_hour ?? 6;
  const closeHour = businessHours?.close_hour ?? 22;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [form, setForm] = useState({ requester_name: "", requester_phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const TIME_SLOTS = useMemo(() => {
    const offset = selectedCourt?.slot_offset_minutes ?? 30;
    const slots: string[] = [];
    for (let h = openHour; h < closeHour; h++) {
      const totalMins = h * 60 + offset;
      if (totalMins + 60 > closeHour * 60) break;
      const hh = Math.floor(totalMins / 60);
      const mm = totalMins % 60;
      slots.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }
    return slots;
  }, [openHour, closeHour, selectedCourt?.slot_offset_minutes]);

  const { data: blockedDatesConfig } = useQuery({
    queryKey: ["blocked-dates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "blocked_dates")
        .maybeSingle();
      try {
        return JSON.parse(data?.value || "[]") as { date: string; reason: string }[];
      } catch {
        return [] as { date: string; reason: string }[];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const blockedDates = useMemo(
    () => new Set((blockedDatesConfig ?? []).map((b) => b.date)),
    [blockedDatesConfig],
  );

  const { data: rentalPrice } = useQuery({
    queryKey: ["court-rental-price"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "court_rental_price")
        .maybeSingle();
      if (error) throw error;
      return data?.value ? Number(data.value) : null;
    },
  });

  const priceDisplay = rentalPrice != null
    ? `R$ ${rentalPrice.toFixed(2).replace(".", ",")}`
    : "R$ —";

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);

  const { data: courts = [] } = useQuery({
    queryKey: ["public-courts-landing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courts").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Court[];
    },
  });

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { data: existingBookings = [] } = useQuery<ExistingBooking[]>({
    queryKey: ["court-bookings-landing", selectedCourt?.id, dateStr],
    queryFn: async () => {
      if (!selectedCourt || !dateStr) return [];
      const { data, error } = await supabase
        .from("court_bookings")
        .select("start_time, end_time, status")
        .eq("court_id", selectedCourt.id)
        .eq("date", dateStr)
        .in("status", ["requested", "confirmed", "paid"]);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourt && !!dateStr,
  });

  const { data: classSessions = [] } = useQuery<ClassSessionRow[]>({
    queryKey: ["class-sessions-landing", selectedCourt?.id, dateStr],
    queryFn: async () => {
      if (!selectedCourt || !dateStr) return [];
      const { data, error } = await supabase
        .from("class_sessions")
        .select("id, classes!inner(court_id, start_time, end_time)")
        .eq("date", dateStr)
        .neq("status", "cancelled");
      if (error) throw error;
      return ((data || []) as ClassSessionRow[]).filter(
        (session) => session.classes?.court_id === selectedCourt.id
      );
    },
    enabled: !!selectedCourt && !!dateStr,
  });

  const { data: recurringClasses = [] } = useQuery<{ start_time: string; end_time: string }[]>({
    queryKey: ["recurring-classes-landing", selectedCourt?.id, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedCourt || !selectedDate) return [];
      const dayOfWeek = selectedDate.getDay();
      const { data, error } = await supabase
        .from("classes")
        .select("start_time, end_time")
        .eq("court_id", selectedCourt.id)
        .eq("status", "active")
        .contains("day_of_week", [dayOfWeek]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCourt && !!selectedDate,
  });

  const unavailableSlots = useMemo(() => {
    const blocked = new Set<string>();
    const now = new Date();
    const isToday = selectedDate
      ? format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
      : false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of TIME_SLOTS) {
      // Block slots already past on today
      if (isToday) {
        const [sh, sm] = slot.split(":").map(Number);
        if (sh * 60 + sm <= nowMinutes) {
          blocked.add(slot);
          continue;
        }
      }

      const slotEnd = addMinutes(slot, 60);
      const blockedByBooking = existingBookings.some((b) => {
        const s = b.start_time?.slice(0, 5);
        const e = b.end_time?.slice(0, 5);
        return s && e && slot < e && slotEnd > s;
      });
      const blockedByClass = classSessions.some((cs) => {
        const s = cs.classes?.start_time?.slice(0, 5);
        const e = cs.classes?.end_time?.slice(0, 5);
        return s && e && slot < e && slotEnd > s;
      });
      const blockedByRecurring = recurringClasses.some((cls) => {
        const s = cls.start_time?.slice(0, 5);
        const e = cls.end_time?.slice(0, 5);
        return s && e && slot < e && slotEnd > s;
      });
      if (blockedByBooking || blockedByClass || blockedByRecurring) blocked.add(slot);
    }
    return blocked;
  }, [existingBookings, classSessions, recurringClasses, TIME_SLOTS, selectedDate]);

  const availableCount = TIME_SLOTS.filter((slot) => !unavailableSlots.has(slot)).length;

  const bookingStart = selectedSlots[0] ?? null;
  const bookingEnd = selectedSlots.length > 0 ? addMinutes(selectedSlots[selectedSlots.length - 1], 60) : null;
  const totalHours = selectedSlots.length;
  const totalPrice = rentalPrice != null && totalHours > 0 ? rentalPrice * totalHours : null;
  const totalPriceDisplay = totalPrice != null
    ? `R$ ${totalPrice.toFixed(2).replace(".", ",")}`
    : "—";
  const durationLabel = totalHours === 1 ? "1h" : `${totalHours}h`;

  const handleSlotClick = (slot: string) => {
    setSelectedSlots((prev) => {
      const idx = prev.indexOf(slot);
      if (idx !== -1) {
        // Deselect: only allow removing first or last
        if (idx === 0) return prev.slice(1);
        if (idx === prev.length - 1) return prev.slice(0, -1);
        // Middle: reset to just this one
        return [slot];
      }
      if (prev.length === 0) return [slot];
      const allIdx = TIME_SLOTS.indexOf(slot);
      const firstIdx = TIME_SLOTS.indexOf(prev[0]);
      const lastIdx = TIME_SLOTS.indexOf(prev[prev.length - 1]);
      if (allIdx === firstIdx - 1) return [slot, ...prev];
      if (allIdx === lastIdx + 1) return [...prev, slot];
      // Not adjacent: start fresh
      return [slot];
    });
  };

  const createBooking = useMutation({
    mutationFn: async () => {
      const rawPhone = cleanPhone(form.requester_phone);
      const validation = bookingSchema.safeParse({
        requester_name: form.requester_name,
        requester_phone: rawPhone,
      });

      if (!validation.success) throw new Error(validation.error.errors[0].message);
      if (!selectedCourt || !dateStr || !bookingStart || !bookingEnd) {
        throw new Error("Selecione quadra, data e horário");
      }

      const { error, data } = await supabase.functions.invoke("court-availability", {
        method: "POST",
        body: {
          court_id: selectedCourt.id,
          date: dateStr,
          start_time: bookingStart,
          end_time: bookingEnd,
          requester_name: validation.data.requester_name,
          requester_phone: rawPhone,
        },
      });

      if (error) {
        const message = (data as any)?.error || error.message;
        throw new Error(message);
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSelectCourt = (court: Court) => {
    setSelectedCourt(court);
    setSelectedDate(undefined);
    setSelectedSlots([]);
    setStep(2);
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(1);
    setSelectedCourt(null);
    setSelectedDate(undefined);
    setSelectedSlots([]);
    setForm({ requester_name: "", requester_phone: "" });
  };

  const stepLabels = ["Escolha a quadra", "Defina data e horário", "Confirme seu pedido"];

  return (
    <Section id="reservar-quadra" className="px-6 py-20 sm:py-24 bg-[#FAFAF7]">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="max-w-[34rem]">
            <SectionLabel>Reserva de quadra</SectionLabel>
            <SectionTitle className="max-w-[12ch]">
              RESERVE SUA QUADRA EM POUCOS PASSOS
            </SectionTitle>
          </div>
          <div className="rounded-[24px] border border-[#E8DECE] bg-[#FAF7F2] p-6">
            <p className="text-sm leading-7 text-[#6B5740]">
              Escolha a quadra, defina data e horário e confirme sua solicitação. Rápido,
              simples e confirmação automática.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="landing-panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-gradient-to-b from-[#F97316]/12 to-[#F97316]/4 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#E8DECE]">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#F97316]/30 bg-[#F97316]/12 text-[#F97316]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F97316]">
                  Reserva confirmada
                </p>
                <h3 className="font-landing-headline mt-4 max-w-[12ch] text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-tight tracking-tight text-[#1A1208]">
                  QUADRA RESERVADA COM SUCESSO.
                </h3>
                <p className="mt-6 max-w-[30rem] text-sm leading-7 text-[#6B5740]">
                  Confirmação automática. Apareça no horário escolhido — sua quadra estará reservada.
                </p>
              </div>

              <div className="p-8 sm:p-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
                  Resumo do pedido
                </p>
                <div className="mt-6 grid gap-3">
                  {[
                    { label: "Quadra", value: selectedCourt?.name || "-" },
                    { label: "Data", value: selectedDate ? format(selectedDate, "dd/MM/yyyy") : "-" },
                    {
                      label: "Horário",
                      value: bookingStart && bookingEnd
                        ? `${bookingStart} – ${bookingEnd} (${durationLabel})`
                        : "-",
                    },
                    { label: "Valor total", value: totalPriceDisplay },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#E8DECE] bg-[#FAF7F2] px-5 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9B8770]">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-base font-semibold text-[#1A1208]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleReset}
                  className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#F97316]/30 bg-[#F97316]/8 px-6 py-3 text-sm font-bold text-[#C2550A] transition hover:bg-[#F97316]/15"
                >
                  Fazer outra reserva
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="landing-panel overflow-hidden">
            {/* Step tabs */}
            <div className="grid border-b border-[#E8DECE] md:grid-cols-3">
              {stepLabels.map((label, index) => {
                const currentStep = (index + 1) as 1 | 2 | 3;
                const isActive = step === currentStep;
                const isDone = step > currentStep;

                return (
                  <button
                    key={label}
                    onClick={() => { if (isDone) setStep(currentStep); }}
                    disabled={!isDone}
                    className={cn(
                      "flex items-center gap-4 px-6 py-5 text-left transition-colors",
                      isActive && "bg-[#FAF7F2]",
                      !isActive && isDone && "cursor-pointer hover:bg-[#F5EFE6]",
                      !isActive && !isDone && "cursor-default opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold uppercase tracking-wide",
                        isActive && "border-[#F97316]/40 bg-[#F97316]/10 text-[#C2550A]",
                        isDone && "border-[#DDD0B8] bg-[#F5EFE6] text-[#6B5740]",
                        !isActive && !isDone && "border-[#EAE1D2] bg-white text-[#B8A888]"
                      )}
                    >
                      {isDone ? "OK" : `0${index + 1}`}
                    </span>
                    <span className="max-w-[12rem] text-sm font-semibold uppercase tracking-[0.15em] text-[#6B5740]">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="mb-8 max-w-[34rem]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
                        Passo 01
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[#6B5740]">
                        Quadras com areia de alta qualidade, iluminação LED e estrutura completa.
                        Escolha a que combina com seu jogo.
                      </p>
                    </div>

                    {courts.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#DDD0B8] px-6 py-12 text-center text-sm text-[#9B8770]">
                        Nenhuma quadra disponível no momento.
                      </div>
                    ) : (
                      <div className="grid gap-5 lg:grid-cols-2">
                        {courts.map((court, index) => (
                          <CourtCard
                            key={court.id}
                            court={court}
                            selected={selectedCourt?.id === court.id}
                            onClick={() => handleSelectCourt(court)}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"
                  >
                    <div className="rounded-[24px] border border-[#E8DECE] bg-[#FAF7F2] p-6">
                      <div className="flex items-center justify-between gap-4">
                        <button
                          onClick={() => setStep(1)}
                          className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770] transition hover:text-[#1A1208]"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Voltar
                        </button>
                        <span className="rounded-full border border-[#DDD0B8] bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B5740]">
                          {selectedCourt?.name}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl border border-[#E8DECE] bg-white p-3">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedSlots([]);
                          }}
                          disabled={(date) =>
                            isBefore(date, today) ||
                            isBefore(maxDate, date) ||
                            !openDays.includes(date.getDay()) ||
                            blockedDates.has(format(date, "yyyy-MM-dd"))
                          }
                          locale={ptBR}
                          className="pointer-events-auto w-full"
                        />
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#E8DECE] bg-[#FAF7F2] p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
                            Horários disponíveis
                          </p>
                          <p className="mt-2 text-sm text-[#6B5740]">
                            {selectedDate
                              ? `${availableCount} faixa${availableCount !== 1 ? "s" : ""} disponível${availableCount !== 1 ? "is" : ""}`
                              : "Escolha uma data para ver os horários"}
                          </p>
                        </div>
                        {selectedDate && (
                          <span className="rounded-full border border-[#F97316]/30 bg-[#F97316]/8 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#C2550A]">
                            {format(selectedDate, "dd MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {!selectedDate ? (
                        <div className="mt-8 rounded-[24px] border border-dashed border-[#DDD0B8] px-6 py-12 text-center text-sm text-[#9B8770]">
                          Selecione uma data no calendário.
                        </div>
                      ) : (
                        <div className="mt-6">
                          <p className="mb-3 text-[11px] text-[#9B8770]">
                            Clique nos horários desejados — cada bloco = 1 hora.
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {availableCount === 0 && (
                              <p className="col-span-full text-sm text-[#9B8770]">
                                Nenhum horário disponível para esta data.
                              </p>
                            )}
                            {TIME_SLOTS.filter((slot) => !unavailableSlots.has(slot)).map((slot) => {
                              const isSelected = selectedSlots.includes(slot);
                              return (
                                <button
                                  key={slot}
                                  onClick={() => handleSlotClick(slot)}
                                  className={cn(
                                    "rounded-xl border px-4 py-3 text-sm font-semibold transition-all text-left",
                                    isSelected
                                      ? "border-[#F97316] bg-[#F97316] text-white shadow-[0_4px_16px_rgba(249,115,22,0.2)]"
                                      : "border-[#E8DECE] bg-white text-[#1A1208] hover:border-[#F97316]/40 hover:bg-[#F97316]/6"
                                  )}
                                >
                                  {slotLabel(slot)}
                                </button>
                              );
                            })}
                          </div>

                          {selectedSlots.length > 0 && (
                            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#F97316]/30 bg-[#F97316]/6 px-4 py-3">
                              <div className="text-sm font-semibold text-[#C2550A]">
                                {bookingStart} – {bookingEnd}
                                <span className="ml-2 font-normal text-[#9B8770]">({durationLabel})</span>
                              </div>
                              {totalPrice != null && (
                                <span className="text-base font-extrabold text-[#C2550A]">
                                  {totalPriceDisplay}
                                </span>
                              )}
                            </div>
                          )}

                          {selectedSlots.length > 0 && (
                            <button
                              onClick={() => setStep(3)}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA6C0A]"
                            >
                              Continuar
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"
                  >
                    <div className="rounded-[24px] border border-[#E8DECE] bg-[#FAF7F2] p-6">
                      <button
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770] transition hover:text-[#1A1208]"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </button>

                      <div className="mt-6 grid gap-3">
                        {[
                          { label: "Quadra", value: selectedCourt?.name || "-" },
                          {
                            label: "Data",
                            value: selectedDate
                              ? format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR })
                              : "-",
                          },
                          {
                            label: "Horário",
                            value: bookingStart && bookingEnd
                              ? `${bookingStart} – ${bookingEnd} (${durationLabel})`
                              : "-",
                          },
                          { label: "Valor total", value: totalPriceDisplay },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-[#E8DECE] bg-white px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9B8770]">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold capitalize text-[#1A1208]">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#E8DECE] bg-[#FAF7F2] p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
                        Confirmar pedido
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[#6B5740]">
                        Informe seu nome e WhatsApp para confirmar a reserva.
                      </p>

                      <div className="mt-6 grid gap-4">
                        <label className="grid gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                            Nome completo *
                          </span>
                          <input
                            type="text"
                            required
                            value={form.requester_name}
                            onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                            placeholder="Seu nome"
                            maxLength={100}
                            className="landing-input"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                            WhatsApp *
                          </span>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A888]" />
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
                              className="landing-input pl-11"
                            />
                          </div>
                        </label>
                      </div>

                      <button
                        onClick={() => createBooking.mutate()}
                        disabled={
                          createBooking.isPending ||
                          !form.requester_name.trim() ||
                          cleanPhone(form.requester_phone).length < 10
                        }
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA6C0A] hover:shadow-[0_8px_24px_rgba(249,115,22,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {createBooking.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Confirmar reserva
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E8DECE] bg-white px-4 py-3 text-sm text-[#6B5740]">
                        <Clock3 className="h-4 w-4 text-[#0EA5E9]" />
                        Confirmação automática e imediata.
                      </div>
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
