export type Procedure = '1' | '2' | '3' | '4' | '5' | 'repeat' | 'consult';
export type Status = 'scheduled' | 'done' | 'cancelled';
export type NotifyEvent = 'created' | 'updated' | 'done' | 'cancelled' | 'restored';

export interface Appointment {
  id: string;
  client_name: string;
  visit_date: string; // YYYY-MM-DD
  visit_time: string; // HH:MM:SS
  procedure: Procedure | null; // null — не указано
  master: string | null;       // null — мастер не выбран
  comment: string | null;
  phone: string | null;
  status: Status;
  is_new_client: boolean;
  created_at: string;
  updated_at: string;
}

export const PROCEDURES: Procedure[] = ['1', '2', '3', '4', '5'];

export function procedureLabel(p: Procedure | null): string {
  if (p === null) return 'Процедура не указана';
  if (p === 'repeat') return 'Повторная процедура';
  if (p === 'consult') return 'Консультация';
  return `${p}-я процедура`;
}

export function procedureShort(p: Procedure | null): string {
  if (p === null) return 'Не указано';
  if (p === 'repeat') return 'Повторная';
  if (p === 'consult') return 'Консультация';
  return `${p}-я`;
}

export function masterLabel(m: string | null): string {
  return m ?? 'мастер не выбран';
}

/** Следующая процедура после предыдущей: консультация → 1, 4 → 5, 5 → повторная. */
export function nextProcedure(prev: Procedure | null): Procedure {
  if (prev === null || prev === 'consult') return '1';
  if (prev === 'repeat' || prev === '5') return 'repeat';
  return String(Number(prev) + 1) as Procedure;
}

export function hm(time: string): string {
  return time.slice(0, 5);
}
