export function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s()-]/g, '');

  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^91\d{10}$/.test(cleaned)) return `+${cleaned}`;

  return null;
}
