import { cleanPhone } from "@/lib/whatsapp";

export const supportsClasses = (mode: string) => mode !== "rentals";

export const supportsRentals = (mode: string) => mode !== "classes";

export const landingImages = {
  hero:
    "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1800&q=80",
  servicesClasses:
    "https://images.unsplash.com/photo-1593786459953-62f5e5e23c16?auto=format&fit=crop&w=1400&q=80",
  servicesRentals:
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80",
  galleryLead:
    "https://images.unsplash.com/photo-1591343395082-e120087004b4?auto=format&fit=crop&w=1400&q=80",
  galleryTraining:
    "https://images.unsplash.com/photo-1507034589631-9433cc6bc453?auto=format&fit=crop&w=1200&q=80",
  galleryLifestyle:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  galleryCrowd:
    "https://images.unsplash.com/photo-1526401485004-2fda9f2b1cff?auto=format&fit=crop&w=1200&q=80",
  galleryNight:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
  galleryMotion:
    "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=1200&q=80",
};

export function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function getDefaultCtaTarget(mode: string) {
  return supportsClasses(mode) ? "aula-teste" : "reservar-quadra";
}

export function getWhatsAppLink(phone: string | null | undefined, message?: string) {
  const digits = cleanPhone(phone || "");

  if (!digits) return "#";

  const fullPhone = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${fullPhone}`;

  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
