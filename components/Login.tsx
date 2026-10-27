'use client';

import { useState } from 'react';
import { sb } from '@/lib/supabase';
import { CENTER_NAME } from '@/lib/config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'Неверная почта или пароль'
          : 'Не получилось войти. Проверьте интернет и попробуйте ещё раз.',
      );
    }
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <div className="mt-20 mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-accent text-[24px] font-bold tracking-tight text-white">
          DV
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">{CENTER_NAME}</h1>
        <p className="text-[15px] text-muted">Расписание записей</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] bg-card">
          <label className="sr-only" htmlFor="email">Почта</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="Почта"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[52px] w-full border-b border-line bg-transparent px-4 outline-none"
          />
          <label className="sr-only" htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-[52px] w-full bg-transparent px-4 outline-none"
          />
        </div>

        {error && <p className="px-4 text-[15px] text-danger" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 h-[54px] rounded-2xl bg-accent text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>
        <p className="px-4 text-center text-[13px] text-muted">
          Вход нужен один раз — телефон запомнит.
        </p>
      </form>
    </main>
  );
}
