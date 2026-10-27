'use client';

import { useEffect, useRef, useState } from 'react';
import { sb, notifyTeam } from '@/lib/supabase';
import { MASTERS } from '@/lib/config';
import { shortDate, suggestedTime, todayISO } from '@/lib/dates';
import {
  hm, nextProcedure, procedureShort, PROCEDURES,
  type Appointment, type Procedure,
} from '@/lib/types';
import Sheet from './Sheet';

interface Props {
  appt?: Appointment;          // есть — редактирование, нет — новая запись
  defaultDate: string;
  onClose: () => void;
  onSaved: (date: string) => void;
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const sectionLabel = 'px-4 text-[13px] uppercase tracking-[0.3px] text-muted';

export default function AppointmentForm({ appt, defaultDate, onClose, onSaved }: Props) {
  const editing = !!appt;
  const [name, setName] = useState(appt?.client_name ?? '');
  const [date, setDate] = useState(appt?.visit_date ?? defaultDate);
  const [time, setTime] = useState(
    appt ? hm(appt.visit_time) : defaultDate === todayISO() ? suggestedTime() : '10:00',
  );
  const [procedure, setProcedure] = useState<Procedure | null>(editing ? appt!.procedure : '1');
  const [master, setMaster] = useState<string | null>(editing ? appt!.master : MASTERS[0]);
  const [comment, setComment] = useState(appt?.comment ?? '');
  const [phone, setPhone] = useState(appt?.phone ?? '');
  const phoneTouched = useRef(editing);
  const [hint, setHint] = useState('');
  const [knownNames, setKnownNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const procTouched = useRef(editing);

  // Подсказки имён из прошлых записей.
  useEffect(() => {
    sb()
      .from('appointments')
      .select('client_name')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const r of (data ?? []) as { client_name: string }[]) {
          const k = r.client_name.toLowerCase();
          if (!seen.has(k)) { seen.add(k); out.push(r.client_name); }
        }
        setKnownNames(out);
      });
  }, []);

  // Новая или постоянная клиентка + следующий номер процедуры.
  useEffect(() => {
    if (editing) return;
    const n = name.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { setHint(''); return; }
    const t = setTimeout(async () => {
      const { data } = await sb()
        .from('appointments')
        .select('procedure, visit_date, phone')
        .ilike('client_name', escapeLike(n))
        .neq('status', 'cancelled')
        .order('visit_date', { ascending: false })
        .order('visit_time', { ascending: false })
        .limit(1);
      const last = (data?.[0] ?? null) as { procedure: Procedure | null; visit_date: string; phone: string | null } | null;
      if (last) {
        if (last.phone && !phoneTouched.current) setPhone(last.phone);
        setHint(`Постоянная клиентка · последняя: ${procedureShort(last.procedure)}, ${shortDate(last.visit_date)}`);
        if (!procTouched.current) setProcedure(nextProcedure(last.procedure));
      } else {
        setHint('Новая клиентка');
        if (!procTouched.current) setProcedure('1');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [name, editing]);

  function pickProcedure(p: Procedure) {
    procTouched.current = true;
    setProcedure(p);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clientName = name.trim().replace(/\s+/g, ' ');
    if (!clientName || !date || !time || saving) return;
    setSaving(true);
    setError('');
    const client = sb();

    // Не записать двух клиенток к одному мастеру на одно время по ошибке.
    const { data: clash } = master
      ? await client
          .from('appointments')
          .select('id, client_name')
          .eq('visit_date', date)
          .eq('visit_time', time)
          .eq('master', master)
          .neq('status', 'cancelled')
      : { data: [] };
    const other = ((clash ?? []) as { id: string; client_name: string }[]).find((c) => c.id !== appt?.id);
    if (other && !window.confirm(`В ${time} у мастера ${master} уже есть запись: ${other.client_name}. Всё равно записать?`)) {
      setSaving(false);
      return;
    }

    const row = {
      client_name: clientName,
      visit_date: date,
      visit_time: time,
      procedure,
      master,
      comment: comment.trim() || null,
      phone: phone.trim() || null,
    };

    const res = editing
      ? await client.from('appointments').update(row).eq('id', appt!.id).select('id').single()
      : await client.from('appointments').insert(row).select('id').single();

    if (res.error || !res.data) {
      setSaving(false);
      setError('Не сохранилось. Проверьте интернет и нажмите ещё раз.');
      return;
    }
    notifyTeam((res.data as { id: string }).id, editing ? 'updated' : 'created');
    onSaved(date);
  }

  async function setStatus(status: 'cancelled' | 'scheduled') {
    if (!appt) return;
    if (status === 'cancelled' &&
      !window.confirm(`Отменить запись: ${appt.client_name}, ${hm(appt.visit_time)}?\nОна сохранится в истории.`)) return;
    setSaving(true);
    const { error } = await sb().from('appointments').update({ status }).eq('id', appt.id);
    if (error) {
      setSaving(false);
      setError('Не сохранилось. Проверьте интернет и нажмите ещё раз.');
      return;
    }
    notifyTeam(appt.id, status === 'cancelled' ? 'cancelled' : 'restored');
    onSaved(appt.visit_date);
  }

  const procBtn = (active: boolean) =>
    `h-11 rounded-xl text-[17px] font-semibold ${active ? 'bg-ink text-white' : 'bg-card text-ink'}`;

  return (
    <Sheet title={editing ? 'Изменить запись' : 'Новая запись'} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-5 pb-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="client-name" className={sectionLabel}>Клиентка</label>
          <input
            id="client-name"
            type="text"
            list="known-names"
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Имя и фамилия"
            required
            autoFocus={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-[52px] rounded-[14px] bg-card px-4 text-[19px] font-semibold outline-none"
          />
          <datalist id="known-names">
            {knownNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          {hint && <p className="px-4 text-[13px] text-muted">{hint}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="client-phone" className={sectionLabel}>Телефон (WhatsApp)</label>
          <input
            id="client-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="8 777 123 45 67 — необязательно"
            value={phone}
            onChange={(e) => {
              phoneTouched.current = true;
              setPhone(e.target.value);
            }}
            className="tabular h-[52px] rounded-[14px] bg-card px-4 outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-[14px] bg-card">
          <div className="flex h-[52px] items-center justify-between border-b border-line px-4">
            <label htmlFor="visit-date" className="text-[17px]">Дата</label>
            <input
              id="visit-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="tabular h-[34px] rounded-lg bg-bg px-3 text-right outline-none"
            />
          </div>
          <div className="flex h-[52px] items-center justify-between px-4">
            <label htmlFor="visit-time" className="text-[17px]">Время</label>
            <input
              id="visit-time"
              type="time"
              required
              step={300}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="tabular h-[34px] rounded-lg bg-bg px-3 text-right outline-none"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${sectionLabel} mb-2`}>Номер процедуры</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {PROCEDURES.map((p) => (
              <button key={p} type="button" aria-pressed={procedure === p} onClick={() => pickProcedure(p)} className={procBtn(procedure === p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" aria-pressed={procedure === 'repeat'} onClick={() => pickProcedure('repeat')} className={procBtn(procedure === 'repeat')}>
              Повторная
            </button>
            <button type="button" aria-pressed={procedure === 'consult'} onClick={() => pickProcedure('consult')} className={procBtn(procedure === 'consult')}>
              Консультация
            </button>
          </div>
          {procedure === null && <p className="px-4 text-[13px] text-muted">Процедура пока не указана</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${sectionLabel} mb-2`}>Мастер</legend>
          <div className={`grid gap-0.5 rounded-xl bg-line p-0.5`} style={{ gridTemplateColumns: `repeat(${MASTERS.length}, minmax(0, 1fr))` }}>
            {MASTERS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={master === m}
                onClick={() => setMaster(m)}
                className={`h-10 rounded-[10px] text-[17px] ${master === m ? 'bg-card font-semibold shadow-sm' : 'bg-transparent'}`}
              >
                {m}
              </button>
            ))}
          </div>
          {master === null && <p className="px-4 text-[13px] text-muted">Мастер пока не выбран</p>}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="visit-note" className={sectionLabel}>Комментарий</label>
          <textarea
            id="visit-note"
            rows={2}
            placeholder="Необязательно"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none rounded-[14px] bg-card px-4 py-3.5 outline-none"
          />
        </div>

        {error && <p className="px-4 text-[15px] text-danger" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="h-[54px] rounded-2xl bg-accent text-[17px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Сохраняем…' : 'Сохранить запись'}
        </button>

        {editing && appt!.status !== 'cancelled' && (
          <button type="button" disabled={saving} onClick={() => setStatus('cancelled')} className="h-11 text-[17px] text-danger">
            Отменить запись
          </button>
        )}
        {editing && appt!.status === 'cancelled' && (
          <button type="button" disabled={saving} onClick={() => setStatus('scheduled')} className="h-11 text-[17px] text-accent">
            Вернуть запись
          </button>
        )}
      </form>
    </Sheet>
  );
}
