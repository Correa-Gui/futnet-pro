import { CheckCircle } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";

interface AboutSectionProps {
  getImage: (k: string, f: string) => string;
}

export function AboutSection({ getImage }: AboutSectionProps) {
  const items = [
    "Quadras com areia de qualidade profissional",
    "Turmas separadas por nível de habilidade",
    "Método progressivo com feedback constante",
    "Horários flexíveis de manhã à noite",
  ];

  return (
    <Section id="sobre" className="py-20 px-6 bg-card">
      <div className="max-w-[1100px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-12 items-center">
        <div className="rounded-2xl overflow-hidden aspect-[4/3]">
          <img
            src={getImage("about", "https://images.unsplash.com/photo-1593786459953-62f5e5e23c16?w=800&q=80")}
            alt="Arena de futevôlei"
            className="object-cover w-full h-full"
          />
        </div>
        <div>
          <SectionLabel>Sobre nós</SectionLabel>
          <SectionTitle>
            Mais que uma quadra. <span className="text-secondary">Uma comunidade.</span>
          </SectionTitle>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            Nascemos da paixão pelo futevôlei e do desejo de criar um espaço onde qualquer pessoa — do iniciante ao competidor — pudesse evoluir de verdade.
          </p>
          <div className="flex flex-col gap-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-[15px] text-foreground">
                <CheckCircle size={18} className="text-secondary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
