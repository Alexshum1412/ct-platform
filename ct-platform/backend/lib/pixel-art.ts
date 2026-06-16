/**
 * pixel-art.ts — конфигурация и серверная логика совместного пиксель-арта.
 *
 * - Полотно GRID×GRID (по умолчанию 500), хранится разрежённо в таблице Pixel.
 * - Фиксированная палитра из 16 цветов (классическая 16-цветная VGA).
 * - Лимит закраски: FREE_DAILY клеток/день на IP + докупленный bonus, сброс 00:00.
 * - Месячный переход: снимок → PNG-архив, очистка полотна (cron + ленивый фолбэк).
 */
import { prisma } from '@/lib/prisma';
import { encodePNGDataUrl } from '@/lib/png';

// Размер полотна. Конфигурируемо: измените GRID (и сделайте db push не требуется —
// клиент читает размер из API). По умолчанию 500×500.
export const GRID = 500;

// Дневные лимиты и курс обмена.
export const FREE_DAILY = 20;          // бесплатных клеток в день на IP
export const BONUS_CAP = 20;           // макс. докупленных клеток в день
export const PIXEL_PRICE = 1000;       // виртуальной валюты за 1 пиксель
export const START_FILL = '#FFFFFF';   // единый стартовый цвет полотна — белый

// Классическая 16-цветная палитра (в духе старых пиксель-арт редакторов / VGA).
export const PALETTE: string[] = [
  '#000000', // чёрный
  '#FFFFFF', // белый
  '#7F7F7F', // серый
  '#C3C3C3', // светло-серый
  '#880015', // тёмно-красный
  '#ED1C24', // красный
  '#FF7F27', // оранжевый
  '#FFF200', // жёлтый
  '#22B14C', // зелёный
  '#00A2E8', // голубой
  '#3F48CC', // синий
  '#A349A4', // фиолетовый
  '#B97A57', // коричневый
  '#FFAEC9', // розовый
  '#99D9EA', // светло-голубой
  '#7092BE', // сине-серый
];
export const META_ID = 'pixel-canvas';

// Принимаем ЛЮБОЙ корректный #RRGGBB (расширенная RGB-палитра на фронте);
// 16 фиксированных цветов остаются «быстрыми» пресетами в UI.
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export function isValidColor(c: unknown): c is string {
  return typeof c === 'string' && HEX_RE.test(c);
}
export function normalizeColor(c: string): string {
  return c.toUpperCase();
}

export function inBounds(x: unknown, y: unknown): boolean {
  return Number.isInteger(x) && Number.isInteger(y) &&
    (x as number) >= 0 && (x as number) < GRID &&
    (y as number) >= 0 && (y as number) < GRID;
}

/** IP клиента из заголовков прокси (Render/Vercel ставят x-forwarded-for). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Серверная дата "YYYY-MM-DD" (локальное серверное время, сброс лимита в 00:00). */
export function serverToday(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Серверный месяц "YYYY-MM". */
export function serverMonth(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Ближайшая локальная полночь (когда обнулится дневной лимит). */
export function nextMidnightISO(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Снимок текущего полотна → PNG data-URL (белый фон + закрашенные клетки). */
export async function renderCanvasPNG(): Promise<{ png: string; count: number }> {
  const pixels = await prisma.pixel.findMany({ select: { x: true, y: true, color: true } });
  const rgb = new Uint8Array(GRID * GRID * 3).fill(255); // белый фон
  for (const p of pixels) {
    if (!inBounds(p.x, p.y)) continue;
    const [r, g, b] = hexToRgb(p.color);
    const idx = (p.y * GRID + p.x) * 3;
    rgb[idx] = r; rgb[idx + 1] = g; rgb[idx + 2] = b;
  }
  return { png: encodePNGDataUrl(GRID, GRID, rgb), count: pixels.length };
}

/**
 * Архивирует полотно под меткой `month` и очищает таблицу pixels.
 * Идемпотентно: если архив за этот месяц уже есть — только чистит pixels.
 */
export async function archiveAndClear(month: string): Promise<{ archived: boolean; count: number }> {
  const exists = await prisma.pixelArchive.findUnique({ where: { month } });
  const { png, count } = await renderCanvasPNG();
  if (!exists) {
    await prisma.pixelArchive.create({ data: { month, png, pixels: count } });
  }
  await prisma.pixel.deleteMany({});
  return { archived: !exists, count };
}

/**
 * Ленивый месячный переход: если полотно относится к прошлому месяцу —
 * архивируем его и начинаем чистый месяц. Возвращает текущий месяц полотна.
 * Безопасно вызывать на каждый GET/POST (дёшево: одна выборка PixelMeta).
 */
export async function ensureCurrentPeriod(): Promise<string> {
  const now = serverMonth();
  let meta = await prisma.pixelMeta.findUnique({ where: { id: META_ID } });
  if (!meta) {
    meta = await prisma.pixelMeta.create({ data: { id: META_ID, month: now } });
    return now;
  }
  if (meta.month !== now) {
    await archiveAndClear(meta.month);
    await prisma.pixelMeta.update({ where: { id: META_ID }, data: { month: now } });
    return now;
  }
  return meta.month;
}

/** Статус дневной квоты по IP (used / limit / remaining / время сброса). */
export async function quotaStatus(ip: string) {
  const date = serverToday();
  const row = await prisma.pixelQuota.findUnique({ where: { ip_date: { ip, date } } });
  const bonus = row?.bonus ?? 0;
  const used = row?.used ?? 0;
  const limit = FREE_DAILY + bonus;
  const remaining = Math.max(0, limit - used);
  return {
    used, bonus, limit, remaining,
    free: FREE_DAILY,
    bonusCap: BONUS_CAP,
    resetAt: nextMidnightISO(),
  };
}

/** Засчитать вклад авторизованного игрока в полотно за месяц (для рейтинга). */
export async function bumpContribution(userId: string | null | undefined, month: string, by = 1) {
  if (!userId || by <= 0) return;
  await prisma.pixelContribution.upsert({
    where: { userId_month: { userId, month } },
    update: { count: { increment: by } },
    create: { userId, month, count: by },
  });
}
