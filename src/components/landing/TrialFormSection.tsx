import { useState, useEffect } from "react";
import { CheckCircle, MessageCircle, Loader2 } from "lucide-react";
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

export function TrialFormSection({ settings, preselectedClassId = "" }: { settings: LandingSettings; preselectedClassId?: string }) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState(preselectedClassId);
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");

  // Sync preselectedClassId
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

    const { error } = await supabase.from("trial_requests" as any).insert({
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

  const waMessage = `Olá! 🏐 Quero agendar minha aula teste de futevôlei!\n\nNome: ${name}${selectedClassName ? `\nTurma: ${selectedClassName}` : ""}${preferredDate ? `\nData preferida: ${new Date(preferredDate + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}\n\nVi no site e quero experimentar!`;

  if (submitted) {
    return (
      <Section id="aula-teste" className="py-20 px-6 bg-card">
        <div className="max-w-[520px] mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-500" size={32} />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
            Recebemos sua solicitação!
          </h2>
          <p className="text-muted-foreground mb-8">
            Para agilizar, confirme pelo WhatsApp:
          </p>
          <a
            href={formatWhatsAppLink(settings.whatsapp_number || "", waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-colors"
          >
            <MessageCircle size={24} />
            Confirmar pelo WhatsApp
          </a>
          <p className="text-sm text-muted-foreground mt-6">
            Também enviaremos uma confirmação assim que o professor aprovar sua vaga.
          </p>
        </div>
      </Section>
    );
  }

  // Compute allowed days for the date picker
  const allowedDays = selectedClass?.day_of_week || [];
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  return (
    <Section id="aula-teste" className="py-20 px-6 bg-card">
      <div className="max-w-[600px] mx-auto text-center mb-10">
        <SectionLabel>Aula Grátis</SectionLabel>
        <SectionTitle>
          Agende Sua <span className="text-secondary">Aula Experimental</span>
        </SectionTitle>
        <p className="text-base text-muted-foreground">
          Preencha o formulário abaixo e agende sua primeira aula gratuita. Sem compromisso!
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-[500px] mx-auto flex flex-col gap-4"
      >
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Nome completo *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            WhatsApp *
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
            placeholder="(11) 99999-9999"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            E-mail <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
          />
        </div>

        {/* Turma */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Turma de preferência
          </label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPreferredDate("");
            }}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
          >
            <option value="">Selecione uma turma</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {formatDaysOfWeek(c.day_of_week)}{" "}
                {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
              </option>
            ))}
          </select>
        </div>

        {/* Data preferida */}
        {classId && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Data preferida <span className="text-muted-foreground">(opcional)</span>
            </label>
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
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
            />
            {allowedDays.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Esta turma tem aula: {formatDaysOfWeek(allowedDays)}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || cleanPhone(phone).length < 10}
          className="w-full mt-2 px-7 py-4 bg-gradient-to-br from-secondary to-orange-600 text-white rounded-xl font-bold text-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            "Quero Minha Aula Grátis"
          )}
        </button>
      </form>
    </Section>
  );
}
