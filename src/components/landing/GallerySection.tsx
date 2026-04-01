import { ArrowUpRight } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import type { LandingSettings } from "./types";
import { landingImages, supportsClasses, supportsRentals } from "./brand";

interface GallerySectionProps {
  settings: LandingSettings;
  getImage: (k: string, f: string) => string;
}

export function GallerySection({ settings, getImage }: GallerySectionProps) {
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  const images = [
    {
      src: getImage("gallery", landingImages.galleryLead),
      label: hasClasses ? "Treino orientado na areia" : "Arena pronta para o jogo",
      className: "col-span-12 row-span-2 md:col-span-7",
    },
    {
      src: landingImages.galleryTraining,
      label: hasClasses ? "Técnica, repetição e leitura" : "Rotina rápida para reservar",
      className: "col-span-12 md:col-span-5",
    },
    {
      src: landingImages.galleryLifestyle,
      label: hasClasses && hasRentals ? "Lifestyle esportivo" : "Ambiente com identidade",
      className: "col-span-12 md:col-span-5",
    },
    {
      src: landingImages.galleryCrowd,
      label: hasRentals ? "Encontro da sua turma" : "Comunidade que puxa frequência",
      className: "col-span-12 md:col-span-4",
    },
    {
      src: landingImages.galleryNight,
      label: hasRentals ? "Noite ativa e agenda viva" : "Energia de arena premium",
      className: "col-span-12 md:col-span-4",
    },
    {
      src: landingImages.galleryMotion,
      label: hasClasses ? "Movimento com intensidade" : "Jogo com fluidez e presença",
      className: "col-span-12 md:col-span-4",
    },
  ];

  return (
    <Section id="galeria" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div className="max-w-[34rem]">
            <SectionLabel light>Galeria editorial</SectionLabel>
            <SectionTitle light className="max-w-[11ch]">
              IMAGEM FORTE, ENQUADRAMENTO CINEMATOGRÁFICO E IDENTIDADE REAL.
            </SectionTitle>
          </div>
          <div className="landing-panel-soft p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="max-w-[34rem] text-sm leading-8 text-white/66 sm:text-base">
                A galeria foi tratada como composição de campanha: blocos assimétricos, legendas
                curtas e imagens que ajudam a vender atmosfera, exclusividade e movimento.
              </p>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-secondary">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              <span className="rounded-full border border-white/10 px-3 py-2">Contraste forte</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Respiro editorial</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Linguagem de marca</span>
            </div>
          </div>
        </div>

        <div className="grid auto-rows-[220px] grid-cols-12 gap-4 md:auto-rows-[240px]">
          {images.map((image) => (
            <article
              key={image.label}
              className={`${image.className} landing-panel group relative overflow-hidden`}
            >
              <img
                src={image.src}
                alt={image.label}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,8,0.08)_10%,rgba(7,7,8,0.72)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Frame
                </p>
                <p className="mt-2 max-w-[22ch] font-heading text-[1.35rem] leading-[1.02] tracking-[-0.03em] text-white">
                  {image.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
