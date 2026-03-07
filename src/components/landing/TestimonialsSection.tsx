import { Star } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";

export function TestimonialsSection() {
  const reviews = [
    { name: "Lucas M.", role: "Aluno há 8 meses", text: "Nunca tinha jogado futevôlei e em 2 meses já estava jogando com amigos. Os professores são incríveis!", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
    { name: "Camila R.", role: "Aluna há 1 ano", text: "A melhor decisão que tomei! Emagreci, fiz amigos e aprendi um esporte que amo.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" },
    { name: "Rafael S.", role: "Aluno há 6 meses", text: "Estrutura de primeira. Quadras profissionais, horários que cabem na minha rotina.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
    { name: "Ana P.", role: "Mãe de aluno", text: "Meu filho de 14 anos adora! Desenvolveu disciplina e trabalho em equipe.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
  ];

  return (
    <Section className="py-20 px-6 bg-card">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Depoimentos</SectionLabel>
        <SectionTitle>O Que Nossos Alunos Dizem</SectionTitle>
      </div>
      <div className="max-w-[1100px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        {reviews.map((r, i) => (
          <div key={i} className="p-6 rounded-2xl border border-border bg-card">
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, j) => (
                <Star key={j} size={16} className="fill-secondary text-secondary" />
              ))}
            </div>
            <p className="text-[15px] text-foreground leading-relaxed mb-4 italic">"{r.text}"</p>
            <div className="flex items-center gap-3">
              <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="text-sm font-bold text-foreground">{r.name}</p>
                <p className="text-[13px] text-muted-foreground">{r.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
