// Только для API-маршрутов (сервер). Не импортировать в компоненты.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

/**
 * Клиент Supabase от имени вошедшей сотрудницы (по её токену из запроса).
 * Возвращает null, если токена нет или он недействителен.
 */
export async function userClient(req: Request): Promise<SupabaseClient | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return client;
}
