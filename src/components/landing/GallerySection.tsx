import { Section, SectionLabel, SectionTitle } from "./Section";

interface GallerySectionProps {
  getImage: (k: string, f: string) => string;
}

export function GallerySection({ getImage }: GallerySectionProps) {
  const images = [
    { src: "https://images.unsplash.com/photo-1593786459953-62f5e5e23c16?w=600&q=80", span: 2, label: "Aulas em grupo" },
    { src: "https://images.unsplash.com/photo-1591343395082-e120087004b4?w=600&q=80", span: 1, label: "Técnica individual" },
    { src: "https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=600&q=80", span: 1, label: "Competições" },
    { src: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80", span: 2, label: "Nossa comunidade" },
  ];

  return (
    <Section className="py-20 px-6 bg-background">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Galeria</SectionLabel>
        <SectionTitle>Veja Nossa Estrutura em Ação</SectionTitle>
      </div>
      <div className="max-w-[1100px] mx-auto grid grid-cols-4 gap-3">
        {images.map((img, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden relative"
            style={{
              gridColumn: `span ${img.span}`,
              aspectRatio: img.span === 2 ? "2/1" : "1/1",
            }}
          >
            <img src={img.src} alt={img.label} className="object-cover w-full h-full" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-6 pb-3 bg-gradient-to-t from-black/60 to-transparent text-white text-sm font-semibold">
              {img.label}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
