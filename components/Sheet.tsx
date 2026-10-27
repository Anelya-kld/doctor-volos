'use client';

import { useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  tall?: boolean;
}

/** Нижняя панель в стиле iOS. */
export default function Sheet({ title, onClose, children, tall }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className={`animate-sheet safe-bottom absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col rounded-t-[20px] bg-bg ${
          tall ? 'h-[94dvh]' : 'max-h-[94dvh]'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex justify-center pt-2" aria-hidden="true">
          <span className="h-[5px] w-9 rounded-full bg-[#C7C7CC]" />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-1">
          <button type="button" onClick={onClose} className="h-11 justify-self-start px-1 text-[17px] text-accent">
            Закрыть
          </button>
          <h2 className="text-[17px] font-semibold whitespace-nowrap">{title}</h2>
          <span />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3">{children}</div>
      </div>
    </div>
  );
}
