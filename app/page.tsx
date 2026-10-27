'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb } from '@/lib/supabase';
import Login from '@/components/Login';
import Schedule from '@/components/Schedule';

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    let client;
    try {
      client = sb();
    } catch {
      setConfigError(true);
      return;
    }
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (configError) {
    return (
      <main className="safe-top px-6 text-center text-muted">
        <p className="mt-24 text-[17px]">Сайт ещё не подключён к базе данных.</p>
        <p className="mt-2 text-[15px]">Добавьте ключи Supabase в настройках Vercel (см. инструкцию).</p>
      </main>
    );
  }

  if (session === undefined) return <main className="min-h-dvh bg-bg" aria-busy="true" />;
  if (!session) return <Login />;
  return <Schedule />;
}
