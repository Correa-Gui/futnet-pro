import { Heart, Users, Target, Sun, Trophy, Dumbbell, MapPin } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import type { LandingSettings } from "./types";

export function BenefitsSection({ settings }: { settings: LandingSettings }) {
  const classeBenefits = [
    { icon: Heart, title: "Saúde & Condicionamento", desc: "Queime até 600 calorias por aula treinando na areia com diversão.", color: "text-red-500", bg: "bg-red-500/10" },
    { icon: Users, title: "Comunidade Vibrante", desc: "Faça amigos, participe de eventos e encontre motivação no grupo.", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Target, title: "Evolução Técnica Real", desc: "Método progressivo do básico ao avançado, com feedback constante.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Sun, title: "Bem-Estar Mental", desc: "Treinar ao ar livre reduz estresse e melhora o humor.", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Trophy, title: "Competições Internas", desc: "Teste suas habilidades em campeonatos entre alunos.", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: Dumbbell, title: "Preparo Completo", desc: "Trabalhe pernas, core, agilidade e reflexo em cada sessão.", color: "text-secondary", bg: "bg-secondary/10" },
  ];
  const rentalBenefits = [
    { icon: MapPin, title: "Quadras Profissionais", desc: "Areia de qualidade, redes oficiais e iluminação noturna.", color: "text-red-500", bg: "bg-red-500/10" },
    { icon: Users, title: "Jogue com Amigos", desc: "Reserve para sua turma e aproveite com liberdade total.", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Target, title: "Reserva Online Fácil", desc: "Escolha data, horário e quadra direto pelo app.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Sun, title: "Horários Flexíveis", desc: "Quadras disponíveis de manhã à noite, todos os dias.", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Trophy, title: "Preço Justo", desc: "Valores acessíveis por hora, sem mensalidade.", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: Dumbbell, title: "Estrutura Completa", desc: "Estacionamento, vestiários e área de convivência.", color: "text-secondary", bg: "bg-secondary/10" },
  ];
  const benefits = settings.business_mode === "rentals" ? rentalBenefits : classeBenefits;

  return (
    <Section id="beneficios" className="py-20 px-6 bg-card">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Benefícios</SectionLabel>
        <SectionTitle>
          {settings.business_mode === "rentals"
            ? <>Por Que <span className="text-secondary">Alugar Com a Gente</span></>
            : <>O Que Você Ganha <span className="text-secondary">Treinando Com a Gente</span></>}
        </SectionTitle>
      </div>
      <div className="max-w-[1100px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        {benefits.map((b, i) => (
          <div
            key={i}
            className="flex gap-4 p-6 rounded-2xl bg-card border border-border transition-all cursor-default hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className={`w-12 h-12 rounded-xl ${b.bg} flex items-center justify-center shrink-0`}>
              <b.icon size={22} className={b.color} />
            </div>
            <div>
              <h3 className="font-heading text-[17px] font-bold text-foreground mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-snug">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
