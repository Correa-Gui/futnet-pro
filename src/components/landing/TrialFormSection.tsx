import { useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneMask, formatWhatsAppLink, cleanPhone } from "@/lib/whatsapp";
import type { LandingSettings } from "./types";

const LEVELS = ["Aprendiz", "Iniciante", "Principiante"] as const;

export function TrialFormSection({ settings }: { settings: LandingSettings }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const minDate = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || cleanPhone(phone).length < 10) return;
    setSubmitting(true);

    const { error } = await supabase.from("trial_requests").insert({
      name: name.trim(),
      phone: cleanPhone(phone),
      level: level || null,
      preferred_date: preferredDate || null,
      status: "pending",
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  };

  const waMessage = `Olá! Quero agendar minha aula experimental de futevôlei!\n\nNome: ${name}${level ? `\nNível: ${level}` : ""}${preferredDate ? `\nDia preferido: ${new Date(preferredDate + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}\n\nVi no site e quero experimentar!`;

  if (submitted) {
    return (
      <Section id="aula-teste" className="px-6 py-20 sm:py-24 bg-[#FAFAF7]">
        <div className="mx-auto max-w-[900px] overflow-hidden landing-panel">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-gradient-to-b from-[#0D9488]/10 to-[#0D9488]/3 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#E8DECE]">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#0D9488]/30 bg-[#0D9488]/10 text-[#0D9488]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0D9488]">
                Solicitação enviada
              </p>
              <h3 className="font-landing-headline mt-4 max-w-[14ch] text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-tight tracking-tight text-[#1A1208]">
                RECEBEMOS SUA SOLICITAÇÃO!
              </h3>
              <p className="mt-6 max-w-[30rem] text-sm leading-7 text-[#6B5740]">
                Sua solicitação foi criada com sucesso. Em breve você receberá uma confirmação pelo WhatsApp com mais informações sobre a sua aula experimental.
              </p>
            </div>

            <div className="p-8 sm:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
                O que acontece agora?
              </p>
              <p className="mt-4 text-base leading-7 text-[#6B5740]">
                Nossa equipe vai analisar sua solicitação e entrar em contato pelo WhatsApp para confirmar o horário e turma da sua aula teste.
              </p>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section id="aula-teste" className="px-6 py-20 sm:py-24 bg-[#FAFAF7]">
      <div className="mx-auto grid max-w-[1320px] gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="landing-panel overflow-hidden p-8 sm:p-10">
          <SectionLabel>Aula experimental</SectionLabel>
          <SectionTitle className="max-w-[12ch]">
            AGENDE SUA AULA EXPERIMENTAL GRATUITA
          </SectionTitle>
          <p className="max-w-[32rem] text-sm leading-7 text-[#6B5740]">
            Sem compromisso. Preencha seus dados e escolha o melhor dia para você. Nossa equipe confirma o horário direto no WhatsApp.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Primeira aula 100% gratuita, sem compromisso.",
              "Avaliação de nível na chegada para a turma ideal.",
              "Confirmação rápida direto no WhatsApp.",
              "Instrutores certificados e metodologia comprovada.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[#E8DECE] bg-[#FAF7F2] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0D9488]/10 text-[#0D9488]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-sm leading-6 text-[#6B5740]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="landing-panel p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9B8770]">
            Agendar aula
          </p>
          <p className="mt-4 max-w-[32rem] text-sm leading-7 text-[#6B5740]">
            Preencha seus dados e escolha o dia de preferência. Confirmamos em até 24h.
          </p>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                Nome completo *
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                placeholder="(11) 99999-9999"
                className="landing-input"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                Nível
              </span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="landing-input"
              >
                <option value="">Selecione seu nível</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9B8770]">
                Dia de preferência
              </span>
              <input
                type="date"
                value={preferredDate}
                min={minDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="landing-input"
              />
              <p className="text-xs leading-6 text-[#B8A898]">
                Opcional — nos ajuda a encontrar o melhor horário para você.
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || cleanPhone(phone).length < 10}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#0D9488] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#0B8276] hover:shadow-[0_8px_24px_rgba(13,148,136,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero minha aula grátis"}
          </button>
        </form>
      </div>
    </Section>
  );
}
