// Телефоны Казахстана: 8 777 123 45 67 → 77771234567 → +7 777 123 45 67

/** Только цифры в международном формате (для ссылки WhatsApp) или null. */
export function phoneDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** Красивый вид номера: +7 777 123 45 67 */
export function formatPhone(raw: string | null | undefined): string {
  const d = phoneDigits(raw);
  if (!d) return raw ?? '';
  if (d.length === 11 && d.startsWith('7')) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }
  return `+${d}`;
}

/** Ссылка, которая открывает чат в WhatsApp. */
export function whatsappLink(raw: string | null | undefined): string | null {
  const d = phoneDigits(raw);
  return d ? `https://wa.me/${d}` : null;
}
