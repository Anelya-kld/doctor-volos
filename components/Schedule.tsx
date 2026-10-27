'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sb, notifyTeam } from '@/lib/supabase';
import { CENTER_NAME } from '@/lib/config';
import {
  isValidISODate, longDate, monthEnd, monthPrepositional, monthStart, nowHM, plural, todayISO, weekdayName,
} from '@/lib/dates';
import { registerServiceWorker, refreshSubscription } from '@/lib/push';
import { hm, type Appointment } from '@/lib/types';
import AppointmentCard from './AppointmentCard';
import AppointmentForm from './AppointmentForm';
import SearchSheet from './SearchSheet';
import MonthCalendar from './MonthCalendar';
import PushBanner, { usePushState } from './PushBanner';
import { SearchIcon } from './icons';

type SheetState = { mode: 'add' } | { mode: 'edit'; appt: Appointment } | null;
type MonthRow = { visit_date: string; procedure: string | null; is_new_client: boolean };

function dateFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const d = new URLSearchParams(window.location.search).get('date');
  return isValidISODate(d) ? d : null;
}

export default function Schedule() {
  const [today, setToday] = useState(todayISO);
  const [date, setDate] = useState(() => dateFromUrl() ?? todayISO());
  const [now, setNow] = useState(nowHM);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [month, setMonth] = useState(() => monthStart(dateFromUrl() ?? todayISO()));
  const [monthCounts, setMonthCounts] = useState<Map<string, number>>(new Map());
  const [stats, setStats] = useState<{ total: number; fresh: number; repeat: number } | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [push, setPush] = usePushState();

  const dateRef = useRef(date);
  dateRef.current = date;
  const todayRef = useRef(today);
  todayRef.current = today;
  const monthRef = useRef(month);
  monthRef.current = month;
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDay = useCallback(async (d: string) => {
    const { data, error } = await sb()
      .from('appointments')
      .select('*')
      .eq('visit_date', d)
      .order('visit_time')
      .order('created_at');
    if (dateRef.current !== d) return;
    if (error) {
      setOffline(true);
    } else {
      setItems((data ?? []) as Appointment[]);
      setOffline(false);
    }
    setLoaded(true);
  }, []);

  // Все записи месяца: для календаря (сколько записей в день) и статистики.
  const loadMonth = useCallback(async (first: string) => {
    const { data } = await sb()
      .from('appointments')
      .select('visit_date, procedure, is_new_client')
      .gte('visit_date', first)
      .lte('visit_date', monthEnd(first))
      .neq('status', 'cancelled')
      .limit(5000);
    if (monthRef.current !== first) return;
    const rows = (data ?? []) as MonthRow[];
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.visit_date, (counts.get(r.visit_date) ?? 0) + 1);
    setMonthCounts(counts);
    setStats({
      total: rows.length,
      fresh: rows.filter((r) => r.is_new_client).length,
      repeat: rows.filter((r) => r.procedure === 'repeat').length,
    });
  }, []);

  const refresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      loadDay(dateRef.current);
      loadMonth(monthRef.current);
    }, 150);
  }, [loadDay, loadMonth]);

  // Смена дня → загрузить и обновить адрес страницы.
  useEffect(() => {
    setLoaded(false);
    setShowCancelled(false);
    loadDay(date);
    setMonth(monthStart(date));
    const url = date === todayRef.current ? '/' : `/?date=${date}`;
    window.history.replaceState(null, '', url);
  }, [date, loadDay]);

  // Смена месяца → календарь и статистика.
  useEffect(() => {
    loadMonth(month);
  }, [month, loadMonth]);

  // Живая синхронизация: любое изменение у любого сотрудника → обновить экран.
  useEffect(() => {
    const client = sb();
    const channel = client
      .channel('appointments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => refresh())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh();
      });
    return () => {
      client.removeChannel(channel);
    };
  }, [refresh]);

  // Часы, переход через полночь, возвращение в приложение.
  useEffect(() => {
    const tick = () => {
      const t = todayISO();
      setNow(nowHM());
      if (t !== todayRef.current) {
        const prevToday = todayRef.current;
        setToday(t);
        if (dateRef.current === prevToday) setDate(t);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        tick();
        refresh();
      }
    };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  // Уведомления: регистрация и переход по нажатию на уведомление.
  useEffect(() => {
    registerServiceWorker().then(refreshSubscription);
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'open-url') return;
      const d = new URL(e.data.url as string).searchParams.get('date');
      if (isValidISODate(d)) setDate(d);
      refresh();
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [refresh]);

  async function toggleDone(a: Appointment) {
    const next = a.status === 'done' ? 'scheduled' : 'done';
    setItems((list) => list.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
    const { error } = await sb().from('appointments').update({ status: next }).eq('id', a.id);
    if (error) {
      loadDay(dateRef.current);
      window.alert('Не сохранилось. Проверьте интернет и попробуйте ещё раз.');
      return;
    }
    notifyTeam(a.id, next === 'done' ? 'done' : 'updated');
  }

  async function logout() {
    if (!window.confirm('Выйти из расписания на этом телефоне?')) return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
    } catch {
      /* ignore */
    }
    await sb().auth.signOut();
  }

  const active = items.filter((a) => a.status !== 'cancelled');
  const cancelled = items.filter((a) => a.status === 'cancelled');
  const doneCount = active.filter((a) => a.status === 'done').length;
  const isToday = date === today;
  let nowIndex = -1;
  if (isToday) {
    nowIndex = active.findIndex((a) => hm(a.visit_time) > now);
    if (nowIndex === -1) nowIndex = active.length;
  }

  const nowLine = (
    <div key="now-line" className="flex items-center gap-2 px-1 py-0.5" aria-label={`Сейчас ${now}`}>
      <span className="tabular text-[12px] font-semibold text-accent">{now}</span>
      <span className="h-[7px] w-[7px] rounded-full bg-accent" />
      <span className="h-[1.5px] flex-1 bg-accent" />
    </div>
  );

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md px-4 pb-16">
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] font-semibold uppercase tracking-[0.4px] text-muted">{CENTER_NAME}</span>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="h-9 rounded-full bg-card px-4 text-[15px] font-semibold text-accent"
            >
              Сегодня
            </button>
          )}
          <button
            type="button"
            aria-label="Поиск по имени"
            onClick={() => setSearchOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
          >
            <SearchIcon />
          </button>
        </div>
      </div>

      <section aria-label="Итоги месяца" className="mt-3">
        <p className="px-1 text-[13px] text-muted">Итоги {monthPrepositional(month)}</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[
            { label: 'Всего клиентов', value: stats?.total },
            { label: 'Новых', value: stats?.fresh },
            { label: 'Повторных', value: stats?.repeat },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card px-3 py-2.5">
              <p className="tabular text-[24px] leading-7 font-bold">{s.value ?? '–'}</p>
              <p className="text-[12px] leading-4 text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <MonthCalendar
        month={month}
        date={date}
        today={today}
        counts={monthCounts}
        onSelect={setDate}
        onMonth={setMonth}
      />

      <header className="mt-5 px-1">
        <p className="text-[15px] font-semibold text-accent">{weekdayName(date)}</p>
        <h1 className="text-[28px] leading-8 font-bold tracking-[-0.5px]">{longDate(date)}</h1>
      </header>

      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">
            {loaded ? (active.length ? `${active.length} ${plural(active.length, ['клиент', 'клиента', 'клиентов'])}` : 'Записей нет') : '\u00A0'}
          </p>
          <p className="text-[13px] text-muted">{doneCount > 0 ? `${doneCount} завершено` : '\u00A0'}</p>
        </div>
        <button
          type="button"
          onClick={() => setSheet({ mode: 'add' })}
          className="h-11 shrink-0 rounded-full bg-accent px-[18px] text-[15px] font-semibold text-white"
        >
          + Записать клиента
        </button>
      </div>

      <PushBanner state={push} onChange={setPush} />

      {offline && (
        <p className="mt-3 rounded-2xl bg-card px-4 py-3 text-[14px] text-danger" role="status">
          Нет связи с сервером. Расписание обновится, когда появится интернет.
        </p>
      )}

      <section aria-label="Записи" className="mt-4 flex flex-col gap-2">
        {active.map((a, i) => (
          <div key={a.id} className="flex flex-col gap-2">
            {i === nowIndex && nowLine}
            <AppointmentCard
              a={a}
              onOpen={() => setSheet({ mode: 'edit', appt: a })}
              onToggleDone={() => toggleDone(a)}
            />
          </div>
        ))}
        {isToday && nowIndex === active.length && active.length > 0 && nowLine}

        {loaded && active.length === 0 && (
          <div className="rounded-2xl bg-card px-4 py-10 text-center">
            <p className="text-[17px] font-semibold">На этот день записей нет</p>
            <p className="mt-1 text-[15px] text-muted">Нажмите «+ Записать клиента»</p>
          </div>
        )}
      </section>

      {cancelled.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            className="h-11 px-1 text-[15px] text-muted"
            aria-expanded={showCancelled}
          >
            {showCancelled ? 'Скрыть отменённые' : `Отменено: ${cancelled.length}`}
          </button>
          {showCancelled && (
            <div className="flex flex-col gap-2">
              {cancelled.map((a) => (
                <AppointmentCard key={a.id} a={a} onOpen={() => setSheet({ mode: 'edit', appt: a })} onToggleDone={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="mt-10 flex flex-col items-center gap-1 text-center text-[13px] text-muted">
        {push === 'granted' && <span>Уведомления включены</span>}
        {push === 'denied' && <span>Уведомления выключены в настройках телефона</span>}
        <button type="button" onClick={logout} className="h-11 px-3 text-[15px] text-accent">
          Выйти
        </button>
      </footer>

      {sheet && (
        <AppointmentForm
          key={sheet.mode === 'edit' ? sheet.appt.id : 'new'}
          appt={sheet.mode === 'edit' ? sheet.appt : undefined}
          defaultDate={date}
          onClose={() => setSheet(null)}
          onSaved={(d) => {
            setSheet(null);
            if (d !== dateRef.current) setDate(d);
            else refresh();
          }}
        />
      )}

      {searchOpen && (
        <SearchSheet
          onClose={() => setSearchOpen(false)}
          onPick={(a) => {
            setSearchOpen(false);
            setDate(a.visit_date);
            setSheet({ mode: 'edit', appt: a });
          }}
        />
      )}
    </main>
  );
}
