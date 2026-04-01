import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneMask, formatWhatsAppLink, formatDaysOfWeek, cleanPhone } from "@/lib/whatsapp";
import type { LandingSettings } from "./types";

interface ClassOption {
  id: string;
  name: string;
  day_of_week: number[];
  start_time: string;
  end_time: string;
  level: string;
}

export function TrialFormSection({
  settings,
  preselectedClassId = "",
}: {
  settings: LandingSettings;
  preselectedClassId?: string;
}) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState(preselectedClassId);
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");

  useEffect(() => {
    if (preselectedClassId) setClassId(preselectedClassId);
  }, [preselectedClassId]);

  useEffect(() => {
    supabase
      .from("classes")
      .select("id, name, day_of_week, start_time, end_time, level")
      .eq("status", "active")
      .then(({ data }) => {
        if (data) setClasses(data as ClassOption[]);
      });
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || cleanPhone(phone).length < 10) return;
    setSubmitting(true);

    const sel = classes.find((c) => c.id === classId);
    setSelectedClassName(sel?.name || "");

    const { error } = await supabase.from("trial_requests").insert({
      name: name.trim(),
      phone: cleanPhone(phone),
      email: email.trim() || null,
      preferred_class_id: classId || null,
      preferred_date: preferredDate || null,
      status: "pending",
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  };

  const waMessage = `Olá! Quero agendar minha aula teste de futevôlei!\n\nNome: ${name}${selectedClassName ? `\nTurma: ${selectedClassName}` : ""}${preferredDate ? `\nData preferida: ${new Date(preferredDate + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}\n\nVi no site e quero experimentar!`;

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
              <h2 className="mt-4 max-w-[10ch] font-heading text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.05em] text-white">
                PRÓXIMO PASSO PELO WHATSAPP.
              </h2>
              <p className="mt-6 max-w-[30rem] text-sm leading-8 text-white/68 sm:text-base">
                Sua intenção já entrou no fluxo. Agora vale confirmar por WhatsApp para acelerar a
                resposta e travar a melhor opção de turma.
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
              <div className="mt-8 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  O que acontece agora
                </p>
                <p className="mt-3 text-sm leading-7 text-white/66">
                  Assim que houver validação da vaga, a confirmação segue no seu contato e mantém a
                  experiência alinhada com o posicionamento premium da landing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  const allowedDays = selectedClass?.day_of_week || [];
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  return (
    <Section id="aula-teste" className="px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="landing-panel overflow-hidden p-8 sm:p-10">
          <SectionLabel light>Aula experimental</SectionLabel>
          <SectionTitle light className="max-w-[10ch]">
            O FORMULÁRIO AGORA FAZ PARTE DA HISTÓRIA, NÃO FICA SOLTO NA PÁGINA.
          </SectionTitle>
          <p className="max-w-[32rem] text-sm leading-8 text-white/68 sm:text-base">
            Em vez de parecer um bloco técnico isolado, a captação foi integrada ao discurso da
            marca com copy, contexto e visual coerentes com a proposta premium.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Selecione a turma e já caia no fluxo com contexto.",
              "A primeira interação mantém sensação de exclusividade.",
              "A transição para WhatsApp continua simples e elegante.",
              "O layout favorece leitura rápida no mobile.",
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
            Preencha os dados e mantenha o ritmo até o CTA final. Clareza, contraste e resposta rápida.
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
                Turma de preferência
              </span>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setPreferredDate("");
                }}
                className="landing-input appearance-none"
              >
                <option value="" className="bg-[#0d1117] text-white">
                  Selecione uma turma
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0d1117] text-white">
                    {c.name} — {formatDaysOfWeek(c.day_of_week)} {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </label>

            {classId && (
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Data preferida
                </span>
                <input
                  type="date"
                  value={preferredDate}
                  min={minDate}
                  onChange={(e) => {
                    const d = new Date(e.target.value + "T12:00:00");
                    if (allowedDays.length === 0 || allowedDays.includes(d.getDay())) {
                      setPreferredDate(e.target.value);
                    }
                  }}
                  className="landing-input"
                />
                {allowedDays.length > 0 && (
                  <p className="text-xs leading-6 text-white/42">
                    Esta turma acontece em: {formatDaysOfWeek(allowedDays)}
                  </p>
                )}
              </label>
            )}
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
