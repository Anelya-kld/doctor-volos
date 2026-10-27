'use client';

import { addDays, dayOfMonth, isSunday, longDate, monthTitle, weekStart, weekdayName, WEEKDAYS_SHORT } from '@/lib/dates';
import { ChevronIcon } from './icons';

interface Props {
  month: string;              // YYYY-MM-01 — какой месяц показан
  date: string;               // выбранный день
  today: string;
  counts: Map<string, number>; // сколько записей в каждый день
  open: boolean;              // true — весь месяц, false — одна неделя
  onToggle: () => void;
  onSelect: (iso: string) => void;
  onMonth: (firstDay: string) => void;
}

function shiftMonth(first: string, delta: number): string {
  const d = new Date(`${first}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta, 1);
  return d.toISOString().slice(0, 10);
}

export default function MonthCalendar({ month, date, today, counts, open, onToggle, onSelect, onMonth }: Props) {
  const monthKey = month.slice(0, 7);
  const cells: string[] = [];
  if (open) {
    const gridStart = weekStart(month);
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      if (i >= 35 && d.slice(0, 7) !== monthKey) break; // не рисовать лишнюю пустую неделю
      cells.push(d);
    }
  } else {
    const start = weekStart(date);
    for (let i = 0; i < 7; i++) cells.push(addDays(start, i));
  }

  const prev = () => (open ? onMonth(shiftMonth(month, -1)) : onSelect(addDays(date, -7)));
  const next = () => (open ? onMonth(shiftMonth(month, 1)) : onSelect(addDays(date, 7)));

  return (
    <section aria-label="Календарь" className="mt-4 rounded-2xl bg-card px-2 pt-2 pb-1">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          aria-label={open ? 'Прошлый месяц' : 'Прошлая неделя'}
          onClick={prev}
          className="flex h-11 w-11 items-center justify-center text-accent"
        >
          <ChevronIcon dir="left" />
        </button>
        <h2 className="text-[17px] font-semibold capitalize">{monthTitle(open ? month : date)}</h2>
        <button
          type="button"
          aria-label={open ? 'Следующий месяц' : 'Следующая неделя'}
          onClick={next}
          className="flex h-11 w-11 items-center justify-center text-accent"
        >
          <ChevronIcon dir="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 pb-1" aria-hidden="true">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="text-center text-[11px] font-semibold text-muted">{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d) => {
          const inMonth = !open || d.slice(0, 7) === monthKey;
          const selected = d === date;
          const isToday = d === today;
          const n = counts.get(d) ?? 0;
          let circle = inMonth ? 'text-ink' : 'text-[#C7C7CC]';
          if (selected) circle = isToday ? 'bg-accent text-white font-semibold' : 'bg-ink text-white font-semibold';
          else if (isToday) circle = 'text-accent font-semibold';
          else if (inMonth && isSunday(d)) circle = 'text-muted';

          return (
            <button
              key={d}
              type="button"
              aria-label={`${weekdayName(d)}, ${longDate(d)}${n ? `, записей: ${n}` : ''}`}
              aria-current={selected ? 'date' : undefined}
              onClick={() => onSelect(d)}
              className="flex h-12 flex-col items-center justify-start gap-0.5"
            >
              <span className={`tabular flex h-8 w-8 items-center justify-center rounded-full text-[16px] ${circle}`}>
                {dayOfMonth(d)}
              </span>
              <span className={`tabular h-3 text-[10px] font-semibold leading-3 ${inMonth ? 'text-accent' : 'text-[#C7C7CC]'}`}>
                {n > 0 ? n : ''}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mx-auto flex h-9 items-center gap-1 px-3 text-[13px] font-semibold text-muted"
      >
        {open ? 'Свернуть' : 'Весь месяц'}
        <span className={`inline-flex transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}>
          <ChevronIcon size={14} dir="right" />
        </span>
      </button>
    </section>
  );
}
