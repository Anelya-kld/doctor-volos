'use client';

import { saveSubscription } from './supabase';
import { VAPID_PUBLIC_KEY } from './config';

export type PushState =
  | 'unsupported'   // браузер не умеет
  | 'needs-install' // iPhone: сначала добавить на экран «Домой»
  | 'default'       // можно включить
  | 'granted'       // включены
  | 'denied';       // запрещены в настройках

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  return Notification.permission as PushState;
}

function vapidKey(): Uint8Array {
  const base64 = VAPID_PUBLIC_KEY;
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    /* ignore */
  }
}

async function subscribe(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey() as unknown as BufferSource,
    });
  }
  return saveSubscription(sub);
}

/** Нажатие «Включить уведомления». Возвращает новое состояние. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission as PushState;
  try {
    await subscribe();
  } catch {
    /* подписка не удалась — останется кнопка */
    return 'default';
  }
  return 'granted';
}

/** При каждом открытии: если уведомления уже разрешены — обновить подписку на сервере. */
export async function refreshSubscription(): Promise<void> {
  if (pushState() !== 'granted') return;
  try {
    await subscribe();
  } catch {
    /* ignore */
  }
}
