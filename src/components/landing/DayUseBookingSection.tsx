import { useState } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneMask, cleanPhone } from "@/lib/whatsapp";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { useBusinessHours } from "@/hooks/useBusinessHours";

export function DayUseBookingSection({ dayUsePrice }: { dayUsePrice: string | null }) {
  const { data: businessHours } = useBusinessHours();
  const openDays = businessHours?.open_days ?? [1, 2, 3, 4, 5, 6];

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [peopleCount, setPeopleCount] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60);

  const pricePerPerson = dayUsePrice
    ? parseFloat(dayUsePrice.replace(/[^\d.,]/g, "").replace(",", "."))
    : null;

  const totalDisplay = pricePerPerson
    ? `R$ ${(pricePerPerson * peopleCount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : null;

  const handleSubmit = async () => {
    const rawPhone = cleanPhone(form.phone);
    if (!form.name.trim() || rawPhone.length < 10 || !selectedDate) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("day_use_bookings").insert({
      date: format(selectedDate, "yyyy-MM-dd"),
      people_count: peopleCount,
      requester_name: form.name.trim(),
      requester_phone: rawPhone,
      price_per_person: pricePerPerson,
      status: "confirmed",
    });
    setSubmitting(false);
    if (insertError) {
      setError("Erro ao registrar reserva. Tente novamente.");
    } else {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(1);
    setSelectedDate(undefined);
    setPeopleCount(1);
    setForm({ name: "", phone: "" });
    setError(null);
  };

  if (submitted) {
    return (
      <Section id="day-use" className="px-6 py-20 sm:py-24 bg-[#F3EDE3]">
        <div className="mx-auto max-w-[760px]">
          <div className="landing-panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1fr_1fr]">
              <div className="bg-gradient-to-b from-[#F97316]/12 to-[#F97316]/4 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#E8DECE]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F97316]/30 bg-[#F97316]/12 text-[#F97316]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F97316]">
                  Reserva confirmada
                </p>
                <h3 className="font-landing-headline mt-3 text-2xl font-extrabold leading-tight tracking-tight text-[#1A1208] sm:text-3xl">
                  Até logo na arena!
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#6B5740]">
                  Sua reserva foi registrada com sucesso. Apareça no dia escolhido.
                </p>
              </div>
              <div className="p-8 sm:p-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
                  Resumo
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  {[
                    { label: "Data", value: selectedDate ? format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR }) : "-" },
                    { label: "Pessoas", value: `${peopleCount} pessoa${peopleCount !== 1 ? "s" : ""}` },
                    ...(totalDisplay ? [{ label: "Total estimado", value: totalDisplay }] : []),
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#E8DECE] bg-[#FAF7F2] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9B8770]">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-[#1A1208]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleReset}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F97316]/30 bg-[#F97316]/8 px-5 py-3 text-sm font-bold text-[#C2550A] transition hover:bg-[#F97316]/15"
                >
                  Nova reserva
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section id="day-use" className="px-6 py-20 sm:py-24 bg-[#F3EDE3]">
      <div className="mx-auto max-w-[1100px]">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Left info */}
          <div>
            <SectionLabel>Day Use</SectionLabel>
            <SectionTitle className="max-w-[14ch]">
              PASSE O DIA INTEIRO NA ARENA.
            </SectionTitle>
            <p className="text-sm leading-7 text-[#6B5740]">
              Acesso ilimitado às quadras, bar, vestiário e área de convivência. Ideal para grupos e confraternizações.
            </p>

            {pricePerPerson && (
              <div className="mt-6 inline-flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#1A1208]">
                  R$ {pricePerPerson.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-[#9B8770]">/ pessoa</span>
              </div>
            )}

            <ul className="mt-6 flex flex-col gap-2.5">
              {[
                "Acesso ilimitado às quadras",
                "Bar e área de lazer incluídos",
                "Vestiário com chuveiro",
                "Estacionamento gratuito",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[#6B5740]">
                  <Sun className="h-4 w-4 shrink-0 text-[#F97316]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right form */}
          <div className="landing-panel overflow-hidden">
            {/* Step tabs */}
            <div className="grid grid-cols-2 border-b border-[#E8DECE]">
              {["Data e grupo", "Seus dados"].map((label, i) => {
                const s = (i + 1) as 1 | 2;
                const isActive = step === s;
                const isDone = step > s;
                return (
                  <button
                    key={label}
                    disabled={!isDone}
                    onClick={() => isDone && setStep(s)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-4 text-left transition-colors",
                      isActive && "bg-[#FAF7F2]",
                      isDone && "cursor-pointer hover:bg-[#F5EFE6]",
                      !isActive && !isDone && "cursor-default opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                        isActive && "border-[#F97316]/40 bg-[#F97316]/10 text-[#C2550A]",
                        isDone && "border-[#DDD0B8] bg-[#F5EFE6] text-[#6B5740]",
                        !isActive && !isDone && "border-[#EAE1D2] bg-white text-[#B8A888]"
                      )}
                    >
                      {isDone ? "✓" : `0${i + 1}`}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6B5740]">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="day-step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="mb-5 text-sm text-[#6B5740]">Selecione a data e informe quantas pessoas virão.</p>

                    <div className="rounded-2xl border border-[#E8DECE] bg-white p-3">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) =>
                          isBefore(date, today) ||
                          isBefore(maxDate, date) ||
                          !openDays.includes(date.getDay())
                        }
                        locale={ptBR}
                        className="pointer-events-auto w-full"
                      />
                    </div>

                    <div className="mt-5">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                        Número de pessoas
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setPeopleCount((n) => Math.max(1, n - 1))}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD0B8] bg-white text-[#6B5740] transition hover:bg-[#F5EFE6]"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-xl font-bold text-[#1A1208]">{peopleCount}</span>
                        <button
                          onClick={() => setPeopleCount((n) => Math.min(30, n + 1))}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD0B8] bg-white text-[#6B5740] transition hover:bg-[#F5EFE6]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        {pricePerPerson && (
                          <span className="ml-2 text-sm font-semibold text-[#F97316]">
                            = {(pricePerPerson * peopleCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={!selectedDate}
                      onClick={() => setStep(2)}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA6C0A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="day-step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                  >
                    <button
                      onClick={() => setStep(1)}
                      className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9B8770] transition hover:text-[#1A1208]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Voltar
                    </button>

                    <div className="mb-5 rounded-xl border border-[#E8DECE] bg-[#FAF7F2] px-4 py-3 text-sm text-[#6B5740]">
                      <span className="font-semibold capitalize text-[#1A1208]">
                        {selectedDate ? format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR }) : ""}
                      </span>
                      {" · "}
                      {peopleCount} pessoa{peopleCount !== 1 ? "s" : ""}
                      {pricePerPerson && (
                        <span className="ml-1 font-semibold text-[#F97316]">
                          · {(pricePerPerson * peopleCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                          Nome completo *
                        </span>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Seu nome"
                          className="landing-input"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                          WhatsApp *
                        </span>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: formatPhoneMask(e.target.value) })}
                          placeholder="(11) 99999-9999"
                          className="landing-input"
                        />
                      </label>
                    </div>

                    {error && (
                      <p className="mt-3 text-sm text-red-500">{error}</p>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={
                        submitting ||
                        !form.name.trim() ||
                        cleanPhone(form.phone).length < 10
                      }
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA6C0A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Day Use"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
