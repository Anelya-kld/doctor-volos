'use client';

import { addDays, dayOfMonth, isSunday, longDate, weekStart, weekdayName, WEEKDAYS_SHORT } from '@/lib/dates';
import { ChevronIcon } from './icons';

interface Props {
  date: string;
  today: string;
  marked: Set<string>;
  onSelect: (iso: string) => void;
}

export default function WeekStrip({ date, today, marked, onSelect }: Props) {
  const start = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <nav aria-label="Дни недели" className="mt-4 flex items-center rounded-2xl bg-card py-2">
      <button
        type="button"
        aria-label="Прошлая неделя"
        onClick={() => onSelect(addDays(date, -7))}
        className="flex h-11 w-8 shrink-0 items-center justify-center text-muted"
      >
        <ChevronIcon dir="left" />
      </button>

      <div className="grid flex-1 grid-cols-7">
        {days.map((d, i) => {
          const selected = d === date;
          const isToday = d === today;
          let circle = 'text-ink';
          if (selected) circle = isToday ? 'bg-accent text-white font-semibold' : 'bg-ink text-white font-semibold';
          else if (isToday) circle = 'text-accent font-semibold';
          else if (isSunday(d)) circle = 'text-muted';

          return (
            <button
              key={d}
              type="button"
              aria-label={`${weekdayName(d)}, ${longDate(d)}`}
              aria-current={selected ? 'date' : undefined}
              onClick={() => onSelect(d)}
              className="flex flex-col items-center gap-1"
            >
              <span className={`text-[11px] font-semibold ${isToday ? 'text-accent' : 'text-muted'}`}>
                {WEEKDAYS_SHORT[i]}
              </span>
              <span className={`tabular flex h-[34px] w-[34px] items-center justify-center rounded-full text-[17px] ${circle}`}>
                {dayOfMonth(d)}
              </span>
              <span
                aria-hidden="true"
                className={`h-[5px] w-[5px] rounded-full ${marked.has(d) && !selected ? 'bg-muted' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Следующая неделя"
        onClick={() => onSelect(addDays(date, 7))}
        className="flex h-11 w-8 shrink-0 items-center justify-center text-muted"
      >
        <ChevronIcon dir="right" />
      </button>
    </nav>
  );
}
