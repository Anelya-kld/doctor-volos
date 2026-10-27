import { TIME_ZONE } from './config';

// Все даты — строки YYYY-MM-DD в часовом поясе Алматы.

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
export const WEEKDAYS_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** Текущее время в Алматы, "HH:MM". */
export function nowHM(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Понедельник недели, в которую входит дата. */
export function weekStart(iso: string): string {
  const dow = (toDate(iso).getUTCDay() + 6) % 7; // 0 = понедельник
  return addDays(iso, -dow);
}

export function dayOfMonth(iso: string): number {
  return toDate(iso).getUTCDate();
}

export function isSunday(iso: string): boolean {
  return toDate(iso).getUTCDay() === 0;
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[toDate(iso).getUTCDay()];
}

/** "26 октября" */
export function longDate(iso: string): string {
  const d = toDate(iso);
  return `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`;
}

const MONTHS_NOM = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

/** Первое число месяца: "2026-10-27" → "2026-10-01" */
export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Последнее число месяца */
export function monthEnd(iso: string): string {
  const d = toDate(monthStart(iso));
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

/** "октябрь 2026" */
export function monthTitle(iso: string): string {
  const d = toDate(iso);
  return `${MONTHS_NOM[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "в октябре" */
export function monthPrepositional(iso: string): string {
  const forms = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  return `в ${forms[toDate(iso).getUTCMonth()]}`;
}

/** "26 окт" */
export function shortDate(iso: string): string {
  const d = toDate(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** "сегодня" / "завтра" / "вчера" / "28 окт" */
export function relativeDay(iso: string, today = todayISO()): string {
  if (iso === today) return 'сегодня';
  if (iso === addDays(today, 1)) return 'завтра';
  if (iso === addDays(today, -1)) return 'вчера';
  return shortDate(iso);
}

/** Ближайшие :00 или :30 после текущего времени (для поля «Время»). */
export function suggestedTime(): string {
  const [h, m] = nowHM().split(':').map(Number);
  let mins = h * 60 + m;
  mins = Math.ceil((mins + 1) / 30) * 30;
  if (mins >= 20 * 60 || mins < 9 * 60) return '10:00';
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function isValidISODate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());
}

export function plural(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}
