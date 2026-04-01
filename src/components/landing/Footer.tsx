import { ArrowUpRight, Instagram, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandingSettings, BusinessHoursData } from "./types";
import { getDefaultCtaTarget, getWhatsAppLink, supportsClasses, supportsRentals } from "./brand";

export function Footer({
  settings,
  businessHours,
}: {
  settings: LandingSettings;
  businessHours: BusinessHoursData | null;
}) {
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  return (
    <footer className="relative z-[1] px-6 pb-8 pt-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="landing-panel overflow-hidden p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary via-orange-500 to-orange-600 text-xl font-brand text-white shadow-[0_14px_32px_rgba(249,115,22,0.28)]">
                  FV
                </div>
                <div>
                  <span className="block font-brand text-[1.5rem] leading-none tracking-[0.16em] text-white">
                    FutVôlei
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.34em] text-white/42">
                    Arena Premium
                  </span>
                </div>
              </div>

              <p className="mt-6 max-w-[28rem] text-sm leading-8 text-white/66 sm:text-base">
                Uma landing reestruturada para parecer marca esportiva contemporânea: mais atitude,
                mais clareza comercial e mais desejo de ação.
              </p>

              <a
                href={`#${getDefaultCtaTarget(settings.business_mode)}`}
                className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white no-underline transition hover:border-white/18 hover:bg-white/[0.07]"
              >
                {hasClasses ? "Agendar experiência" : hasRentals ? "Reservar quadra" : "Começar"}
                <ArrowUpRight className="h-4 w-4 text-secondary" />
              </a>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                Navegação
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {[
                  { label: "Experiência", href: "#beneficios" },
                  ...(hasClasses ? [{ label: "Turmas", href: "#turmas" }] : []),
                  ...(hasRentals ? [{ label: "Quadras", href: "#reservar-quadra" }] : []),
                  { label: "Planos", href: "#planos" },
                  { label: "FAQ", href: "#faq" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm leading-7 text-white/64 no-underline transition hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                Contato
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <a
                  href={getWhatsAppLink(settings.whatsapp_number)}
                  className="text-sm leading-7 text-white/64 no-underline transition hover:text-white"
                >
                  WhatsApp
                </a>
                <div className="mt-2 flex gap-2">
                  {[
                    { Icon: Instagram, url: settings.instagram_url },
                    { Icon: Youtube, url: settings.youtube_url },
                  ].map(({ Icon, url }, index) => (
                    <a
                      key={index}
                      href={url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/74 transition hover:border-secondary/30 hover:bg-secondary/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {businessHours ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                  Funcionamento
                </p>
                <p className="mt-5 text-sm leading-7 text-white/64">
                  {String(businessHours.open_hour).padStart(2, "0")}:00 - {String(businessHours.close_hour).padStart(2, "0")}:00
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dayLabels.map((label, index) => (
                    <span
                      key={label}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        businessHours.open_days.includes(index)
                          ? "border-secondary/22 bg-secondary/12 text-secondary/88"
                          : "border-white/10 bg-white/[0.03] text-white/30"
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-10 border-t border-white/8 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/32">
              © {new Date().getFullYear()} FutVôlei Arena. Design orientado a performance, exclusividade e conversão.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
