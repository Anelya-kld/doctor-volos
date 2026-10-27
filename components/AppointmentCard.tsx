'use client';

import { hm, masterLabel, procedureLabel, type Appointment } from '@/lib/types';
import { CheckIcon, NoteIcon } from './icons';

interface Props {
  a: Appointment;
  onOpen: () => void;
  onToggleDone: () => void;
}

export default function AppointmentCard({ a, onOpen, onToggleDone }: Props) {
  const done = a.status === 'done';
  const cancelled = a.status === 'cancelled';
  const dim = done || cancelled;

  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-card py-3 pr-3 pl-4 ${cancelled ? 'opacity-70' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${hm(a.visit_time)}, ${a.client_name}. Изменить запись`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className={`tabular w-12 shrink-0 text-[17px] font-semibold ${dim ? 'text-muted' : ''}`}>
          {hm(a.visit_time)}
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`truncate text-[19px] font-semibold leading-6 ${dim ? 'text-muted line-through' : ''}`}>
              {a.client_name}
            </span>
            {a.is_new_client && !dim && (
              <span className="shrink-0 rounded-md bg-accent-soft px-[7px] py-[2px] text-[12px] font-semibold text-accent">
                Новая
              </span>
            )}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-muted">
            <span className="truncate">
              {cancelled ? 'Отменена · ' : ''}
              {procedureLabel(a.procedure)} · {masterLabel(a.master)}
            </span>
            {a.comment && <NoteIcon />}
          </span>
        </span>
      </button>

      {!cancelled && (
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          aria-label={done ? 'Завершено — снять отметку' : 'Отметить: процедура завершена'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
            done ? 'bg-done' : 'border-[1.5px] border-[#D2D2D7] bg-card'
          }`}
        >
          <CheckIcon color={done ? '#FFFFFF' : '#C7C7CC'} />
        </button>
      )}
    </div>
  );
}
