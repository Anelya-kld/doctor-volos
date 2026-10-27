import webpush from 'web-push';
import { userClient } from '@/lib/server';
import { VAPID_PUBLIC_KEY } from '@/lib/config';
import { relativeDay } from '@/lib/dates';
import { hm, masterLabel, procedureLabel, type Appointment, type NotifyEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TITLES: Record<NotifyEvent, string> = {
  created: 'Новая запись',
  updated: 'Запись изменена',
  done: 'Процедура завершена',
  cancelled: 'Запись отменена',
  restored: 'Запись восстановлена',
};

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function POST(req: Request) {
  const db = await userClient(req);
  if (!db) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: string; event?: NotifyEvent } | null;
  const id = body?.id;
  const event = body?.event;
  if (!id || !event || !(event in TITLES)) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) return Response.json({ error: 'push not configured' }, { status: 500 });
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@doctorvolos.kz',
    VAPID_PUBLIC_KEY,
    privateKey,
  );

  const { data, error } = await db.from('appointments').select('*').eq('id', id).single();
  const appt = data as Appointment | null;
  if (error || !appt) return Response.json({ error: 'not found' }, { status: 404 });

  // Например: «Мадина — сегодня, 11:30 · 5-я процедура · Асель»
  const when = `${relativeDay(appt.visit_date)}, ${hm(appt.visit_time)}`;
  const extra = event === 'created' && appt.is_new_client ? ' · новая клиентка' : '';
  const payload = JSON.stringify({
    title: TITLES[event],
    body: `${appt.client_name} — ${when}\n${procedureLabel(appt.procedure)} · ${masterLabel(appt.master)}${extra}`,
    tag: `appt-${appt.id}`,
    url: `/?date=${appt.visit_date}`,
  });

  // Всем телефонам, кроме телефонов той, кто сделала изменение.
  const { data: subs } = await db.rpc('team_push_subscriptions');
  const list = (subs ?? []) as SubRow[];
  const results = await Promise.allSettled(
    list.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 12, urgency: 'high' },
      ),
    ),
  );

  // Убрать телефоны, которые отписались или удалили иконку.
  const gone = results
    .map((r, i) => {
      if (r.status !== 'rejected') return null;
      const code = (r.reason as { statusCode?: number } | undefined)?.statusCode;
      return code === 404 || code === 410 ? list[i].endpoint : null;
    })
    .filter((e): e is string => !!e);
  if (gone.length) await db.rpc('remove_push_subscriptions', { p_endpoints: gone });

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return Response.json({ sent, failed: results.length - sent });
}
