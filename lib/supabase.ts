'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NotifyEvent } from './types';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** Один общий клиент Supabase на всё приложение (создаётся только в браузере). */
export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

async function accessToken(): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.access_token ?? null;
}

/** Разослать уведомление остальным сотрудникам. Ошибки не мешают работе. */
export async function notifyTeam(id: string, event: NotifyEvent): Promise<void> {
  try {
    const token = await accessToken();
    if (!token) return;
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, event }),
      keepalive: true,
    });
  } catch {
    /* уведомление не критично */
  }
}

export async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const token = await accessToken();
  if (!token) return false;
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
  });
  return res.ok;
}
