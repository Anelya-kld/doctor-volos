import { userClient } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  userAgent?: string;
}

export async function POST(req: Request) {
  const db = await userClient(req);
  if (!db) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: 'bad subscription' }, { status: 400 });
  }

  const { error } = await db.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.keys.p256dh,
    p_auth: sub.keys.auth,
    p_user_agent: body?.userAgent ?? '',
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
