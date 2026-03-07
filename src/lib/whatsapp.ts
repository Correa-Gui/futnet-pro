export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatWhatsAppLink(phone: string, message: string): string {
  const clean = cleanPhone(phone);
  const full = clean.startsWith('55') ? clean : `55${clean}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

export function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatDaysOfWeek(days: number[]): string {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days.map(d => names[d] || '').join(', ');
}

export function formatLevelLabel(level: string): string {
  const map: Record<string, string> = {
    beginner: 'Iniciante',
    elementary: 'Elementar',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  };
  return map[level] || level;
}
