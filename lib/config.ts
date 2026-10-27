// Мастера центра. Чтобы добавить нового мастера — допишите имя в этот список.
export const MASTERS = ['Асель', 'Эльзора'] as const;

// Основательница центра — её записи выделяются отдельным цветом.
export const FOUNDER = 'Асель';

export const CENTER_NAME = 'Доктор волос';
export const TIME_ZONE = 'Asia/Almaty';

// Публичные адреса и ключи (их можно показывать — данные защищены входом и правилами базы).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bndgocbmplzrvplribeu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_A4F-MtOy88QDsoBmvdWqXQ_KdRCzFW5';
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BETqhgTdp_c88ZIYIiw22ATUH2JmqthKNUahWgLMs8Aq5eG0e-LXTl7TP-gERz0WW3-eiFNdiz1iliEIZUeTmWk';
