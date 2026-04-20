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
  const [email, setEmail] = useState("");
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
      email: email.trim() || null,
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
      <Section id="aula-teste" className="px-6 py-20 sm:py-24">
        <div className="landing-panel mx-auto max-w-[900px] overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-[linear-gradient(180deg,rgba(249,115,22,0.18)_0%,rgba(249,115,22,0.04)_100%)] p-8 sm:p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-secondary/20 bg-secondary/15 text-secondary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary/80">
                Solicitação recebida
              </p>
              <h3 className="font-landing-headline mt-4 max-w-[10ch] text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-white">
                PRÓXIMO PASSO PELO WHATSAPP.
              </h3>
              <p className="mt-6 max-w-[30rem] text-sm leading-8 text-white/68 sm:text-base">
                Sua solicitação foi recebida. Confirme pelo WhatsApp para garantir o horário.
              </p>
            </div>

            <div className="p-8 sm:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Ação final
              </p>
              <p className="mt-4 text-base leading-8 text-white/68">
                Um toque e você cai direto na conversa com a mensagem pronta.
              </p>
              <a
                href={formatWhatsAppLink(settings.whatsapp_number || "", waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-3 rounded-full border border-secondary/35 bg-gradient-to-r from-secondary to-orange-600 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white no-underline transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(249,115,22,0.25)]"
              >
                <MessageCircle className="h-4 w-4" />
                Confirmar pelo WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section id="aula-teste" className="px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="landing-panel overflow-hidden p-8 sm:p-10">
          <SectionLabel light>Aula experimental</SectionLabel>
          <SectionTitle light className="max-w-[10ch]">
            AGENDE SUA AULA EXPERIMENTAL GRATUITA
          </SectionTitle>
          <p className="max-w-[32rem] text-sm leading-8 text-white/68 sm:text-base">
            Sem compromisso. Preencha seus dados e escolha o melhor dia para você. Nossa equipe confirma o horário direto no WhatsApp.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Primeira aula 100% gratuita, sem compromisso.",
              "Avaliação de nível na chegada para a turma ideal.",
              "Confirmação rápida direto no WhatsApp.",
              "Instrutores certificados e metodologia comprovada.",
            ].map((item) => (
              <div key={item} className="landing-panel-soft p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-sm leading-7 text-white/66">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="landing-panel p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Agendar aula
          </p>
          <p className="mt-4 max-w-[32rem] text-sm leading-8 text-white/68 sm:text-base">
            Preencha seus dados e escolha o dia de preferência. Confirmamos em até 24h.
          </p>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="landing-input"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Dia de preferência
              </span>
              <input
                type="date"
                value={preferredDate}
                min={minDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="landing-input"
              />
              <p className="text-xs leading-6 text-white/42">
                Opcional — nos ajuda a encontrar o melhor horário para você.
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || cleanPhone(phone).length < 10}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full border border-secondary/35 bg-gradient-to-r from-secondary to-orange-600 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(249,115,22,0.25)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero minha aula grátis"}
          </button>
        </form>
      </div>
    </Section>
  );
}
