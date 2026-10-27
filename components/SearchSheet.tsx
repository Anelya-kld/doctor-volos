'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { relativeDay } from '@/lib/dates';
import { hm, masterLabel, procedureShort, type Appointment } from '@/lib/types';
import Sheet from './Sheet';
import { SearchIcon } from './icons';

interface Props {
  onClose: () => void;
  onPick: (a: Appointment) => void;
}

export default function SearchSheet({ onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Appointment[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      const safe = term.replace(/[\\%_]/g, (m) => `\\${m}`);
      const { data } = await sb()
        .from('appointments')
        .select('*')
        .ilike('client_name', `%${safe}%`)
        .order('visit_date', { ascending: false })
        .order('visit_time', { ascending: true })
        .limit(50);
      setResults((data ?? []) as Appointment[]);
      setSearched(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Sheet title="Поиск" onClose={onClose} tall>
      <div className="flex h-11 items-center gap-2 rounded-xl bg-line/70 px-3">
        <SearchIcon size={18} color="#86868B" />
        <label htmlFor="search" className="sr-only">Имя клиентки</label>
        <input
          id="search"
          type="search"
          autoFocus
          autoComplete="off"
          placeholder="Имя клиентки"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-full flex-1 bg-transparent outline-none"
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2 pb-6">
        {results.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onPick(a)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-left"
            >
              <span className="flex min-w-0 flex-col">
                <span className={`truncate text-[17px] font-semibold ${a.status === 'cancelled' ? 'text-muted line-through' : ''}`}>
                  {a.client_name}
                </span>
                <span className="truncate text-[14px] text-muted">
                  {procedureShort(a.procedure)} · {masterLabel(a.master)}
                  {a.status === 'done' ? ' · завершена' : a.status === 'cancelled' ? ' · отменена' : ''}
                </span>
              </span>
              <span className="tabular shrink-0 text-right text-[14px] text-muted">
                {relativeDay(a.visit_date)}
                <br />
                {hm(a.visit_time)}
              </span>
            </button>
          </li>
        ))}
        {searched && results.length === 0 && (
          <li className="px-4 pt-6 text-center text-[15px] text-muted">Никого не нашли</li>
        )}
      </ul>
    </Sheet>
  );
}
