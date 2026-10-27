'use client';

import { useEffect, useState } from 'react';
import { enablePush, pushState, type PushState } from '@/lib/push';
import { BellIcon } from './icons';

const DISMISS_KEY = 'dv-install-hint-dismissed';

export function usePushState(): [PushState | null, (s: PushState) => void] {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => setState(pushState()), []);
  return [state, setState];
}

export default function PushBanner({ state, onChange }: { state: PushState | null; onChange: (s: PushState) => void }) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (state === 'default') {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
        <span className="text-accent"><BellIcon /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Включите уведомления</p>
          <p className="text-[13px] text-muted">Новые записи и изменения — сразу на экран</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            onChange(await enablePush());
            setBusy(false);
          }}
          className="h-9 shrink-0 rounded-full bg-accent px-4 text-[15px] font-semibold text-white disabled:opacity-60"
        >
          Включить
        </button>
      </div>
    );
  }

  if (state === 'needs-install' && !hidden) {
    return (
      <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-accent"><BellIcon /></span>
          <p className="text-[15px] font-semibold">Чтобы приходили уведомления</p>
        </div>
        <p className="text-[14px] leading-5 text-muted">
          Нажмите «Поделиться» внизу Safari → «На экран „Домой“». Потом откройте расписание с новой иконки и нажмите «Включить».
        </p>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
          }}
          className="h-9 self-end px-2 text-[15px] text-accent"
        >
          Понятно
        </button>
      </div>
    );
  }

  return null;
}
