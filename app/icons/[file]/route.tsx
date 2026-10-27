import { ImageResponse } from 'next/og';

// Иконки приложения рисуются на сервере: /icons/icon-192.png, /icons/apple-touch-icon.png и т. д.
const SIZES: Record<string, { size: number; badge?: boolean; maskable?: boolean }> = {
  'icon-192.png': { size: 192 },
  'icon-512.png': { size: 512 },
  'icon-maskable-512.png': { size: 512, maskable: true },
  'apple-touch-icon.png': { size: 180 },
  'badge-96.png': { size: 96, badge: true },
};

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(SIZES).map((file) => ({ file }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const spec = SIZES[file];
  if (!spec) return new Response('Not found', { status: 404 });
  const { size, badge, maskable } = spec;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: badge ? 'transparent' : '#0071E3',
          color: badge ? '#000000' : '#FFFFFF',
          fontSize: Math.round(size * (maskable ? 0.3 : badge ? 0.45 : 0.4)),
          fontWeight: 700,
          letterSpacing: -size * 0.01,
          fontFamily: 'sans-serif',
        }}
      >
        DV
      </div>
    ),
    { width: size, height: size },
  );
}
