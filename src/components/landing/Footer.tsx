import { Instagram, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandingSettings, BusinessHoursData } from "./types";

export function Footer({
  settings,
  businessHours,
}: {
  settings: LandingSettings;
  businessHours: BusinessHoursData | null;
}) {
  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : "#";
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <footer className="bg-foreground border-t border-white/[0.08] pt-16 pb-6 px-6">
      <div className="max-w-[1100px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10 mb-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center text-white font-brand text-base">
              FV
            </div>
            <span className="text-white font-heading text-base font-bold">FutVôlei Arena</span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">A melhor arena de futevôlei da cidade.</p>
        </div>

        {/* Links */}
        <div>
          <p className="text-white font-semibold mb-4 text-[15px]">Links</p>
          {["Sobre", "Benefícios", "Planos", "FAQ"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace("í", "i")}`}
              className="block text-white/50 no-underline text-sm mb-2.5 hover:text-white transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        {/* Contact */}
        <div>
          <p className="text-white font-semibold mb-4 text-[15px]">Contato</p>
          <a href={waLink} className="text-white/50 no-underline text-sm mb-4 block">WhatsApp</a>
          <div className="flex gap-2">
            {[
              { Icon: Instagram, url: settings.instagram_url },
              { Icon: Youtube, url: settings.youtube_url },
            ].map(({ Icon, url }, i) => (
              <a
                key={i}
                href={url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-white hover:bg-secondary hover:border-secondary transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Business hours */}
        {businessHours && (
          <div>
            <p className="text-white font-semibold mb-4 text-[15px]">Funcionamento</p>
            <p className="text-white/50 text-sm mb-2">
              {String(businessHours.open_hour).padStart(2, "0")}:00 — {String(businessHours.close_hour).padStart(2, "0")}:00
            </p>
            <div className="flex gap-1 flex-wrap">
              {dayLabels.map((label, i) => (
                <span
                  key={i}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-xs font-semibold border",
                    businessHours.open_days.includes(i)
                      ? "bg-secondary/20 text-secondary/70 border-secondary/30"
                      : "bg-white/5 text-white/20 border-white/[0.08]"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.08] pt-6 flex justify-between items-center flex-wrap gap-3">
        <p className="text-white/30 text-[13px]">
          © {new Date().getFullYear()} FutVôlei Arena. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
