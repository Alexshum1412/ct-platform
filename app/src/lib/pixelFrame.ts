/**
 * pixelFrame.ts — рендер «оформленной» версии полотна пиксель-арта: рамка в
 * тематике сайта, заголовок, месяц/дата и бренд CT-Platform. Используется для
 * предпросмотра и скачивания текущего полотна и архивных месяцев.
 */

const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** "2026-06" → "Июнь 2026" */
export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${RU_MONTHS_NOM[(m || 1) - 1] ?? month} ${y || ''}`.trim();
}

function todayLabel(): string {
  const d = new Date();
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()} г.`;
}

/**
 * Строит оформленный canvas: рамка-градиент, шапка с названием и брендом,
 * пиксель-полотно (без сглаживания), подвал с месяцем и адресом сайта.
 */
export function buildFramedCanvas(
  source: CanvasImageSource,
  opts: { month: string; subtitle?: string },
): HTMLCanvasElement {
  const S = 960;            // область полотна
  const padX = 64;          // боковые поля
  const top = 150;          // шапка
  const bottom = 132;       // подвал
  const W = S + padX * 2;
  const H = top + S + bottom;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;

  // Фон — мягкий градиент в тематике сайта.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#faf5ff');
  bg.addColorStop(0.5, '#f5f3ff');
  bg.addColorStop(1, '#eef2ff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Внешняя рамка-градиент (брендовый фиолетовый).
  const border = ctx.createLinearGradient(0, 0, W, 0);
  border.addColorStop(0, '#7c3aed');
  border.addColorStop(1, '#a855f7');
  ctx.lineWidth = 12;
  ctx.strokeStyle = border;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Шапка: логотип-плитка + название.
  ctx.fillStyle = '#7c3aed';
  roundRect(ctx, padX, 46, 56, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('▦', padX + 28, 74);

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#1e1b2e';
  ctx.font = '800 42px system-ui, "Segoe UI", sans-serif';
  ctx.fillText('Пиксель-арт', padX + 74, 78);
  ctx.fillStyle = '#6d28d9';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(monthTitle(opts.month), padX + 76, 108);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7c3aed';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('CT-Platform', W - padX, 74);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 18px system-ui, sans-serif';
  ctx.fillText('коллективное полотно', W - padX, 102);

  // Полотно: белая подложка + пиксельная картинка без сглаживания + тонкая рамка.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(padX, top, S, S);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, padX, top, S, S);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(padX + 1, top + 1, S - 2, S - 2);

  // Подвал: дата генерации/архива + адрес сайта.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b7280';
  ctx.font = '400 20px system-ui, sans-serif';
  ctx.fillText(opts.subtitle ?? `Сохранено ${todayLabel()}`, padX, H - 56);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7c3aed';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('ct-platform.by', W - padX, H - 56);

  return cv;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Скачать canvas как PNG-файл. */
export function downloadCanvas(cv: HTMLCanvasElement, filename: string) {
  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

/** Загружает картинку (data-URL/URL) и возвращает HTMLImageElement (для архива). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
