/**
 * PixelArtPage — скрытая страница совместного пиксель-арта (в духе r/place).
 *
 * Ссылка на страницу есть ТОЛЬКО в подвале рядом с «Политикой конфиденциальности».
 * Полотно общее: пиксели хранятся на сервере, обновляются у всех без перезагрузки
 * (инкрементальный поллинг). Поток: клик по клетке → выбор цвета → подтверждение.
 * Лимит закраски (по IP) проверяется на бэкенде. Докупка пикселей живёт ТОЛЬКО на
 * страницах мини-игр и здесь НЕ показывается.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette, ZoomIn, ZoomOut, Check, RefreshCw, Info, Sparkles, Clock, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { useAppStore } from '@/store/useAppStore';
import { pixelArtApi, type PixelConfig, type PixelQuota } from '@/lib/api/client';

const POLL_MS = 4000;
const ZOOMS = [1, 2, 4, 8, 12, 16, 24];
const MAG_CELLS = 11;   // окно лупы (нечётное — есть центр)
const MAG_CELL_PX = 14; // размер клетки в лупе

const keyOf = (x: number, y: number) => `${x},${y}`;
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); } catch { return '00:00'; }
}

export function PixelArtPage() {
  const token = useAppStore((s) => s.token);

  const [config, setConfig] = useState<PixelConfig | null>(null);
  const [quota, setQuota] = useState<PixelQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(4);
  const [sel, setSel] = useState<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const magRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Map<string, string>>(new Map());
  const lastSyncRef = useRef<string | null>(null);
  const grid = config?.grid ?? 500;

  // — низкоуровневая отрисовка —
  const drawCell = useCallback((x: number, y: number, c: string) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }, []);

  const drawAll = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !config) return;
    ctx.fillStyle = config.startFill;
    ctx.fillRect(0, 0, config.grid, config.grid);
    pixelsRef.current.forEach((c, k) => {
      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    });
  }, [config]);

  // — лупа вокруг выбранной клетки —
  const drawMag = useCallback(() => {
    const ctx = magRef.current?.getContext('2d');
    if (!ctx || !config) return;
    const size = MAG_CELLS * MAG_CELL_PX;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);
    if (!sel) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('выберите клетку', size / 2, size / 2);
      return;
    }
    const half = Math.floor(MAG_CELLS / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const gx = sel.x + dx, gy = sel.y + dy;
        const inField = gx >= 0 && gx < config.grid && gy >= 0 && gy < config.grid;
        const center = dx === 0 && dy === 0;
        let c = inField ? (pixelsRef.current.get(keyOf(gx, gy)) || config.startFill) : '#1e293b';
        if (center && color) c = color; // предпросмотр выбранного цвета
        ctx.fillStyle = c;
        ctx.fillRect((dx + half) * MAG_CELL_PX, (dy + half) * MAG_CELL_PX, MAG_CELL_PX, MAG_CELL_PX);
        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.strokeRect((dx + half) * MAG_CELL_PX + 0.5, (dy + half) * MAG_CELL_PX + 0.5, MAG_CELL_PX - 1, MAG_CELL_PX - 1);
      }
    }
    // центр — рамка
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.strokeRect(half * MAG_CELL_PX + 1, half * MAG_CELL_PX + 1, MAG_CELL_PX - 2, MAG_CELL_PX - 2);
  }, [sel, color, config]);

  useEffect(() => { drawMag(); }, [drawMag]);

  // — начальная загрузка —
  const initialLoad = useCallback(() => {
    setLoading(true);
    void pixelArtApi.get(null, token).then((res) => {
      if (res.data) {
        setConfig(res.data.config);
        setQuota(res.data.quota);
        lastSyncRef.current = res.data.serverTime;
        const m = new Map<string, string>();
        for (const p of res.data.pixels) m.set(keyOf(p.x, p.y), p.c);
        pixelsRef.current = m;
        setError(null);
      } else {
        setError(res.error || 'Не удалось загрузить полотно');
      }
    }).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { initialLoad(); }, [initialLoad]);

  // отрисовать всё, когда появился config/canvas
  useEffect(() => { if (config) requestAnimationFrame(drawAll); }, [config, drawAll]);

  // — инкрементальный поллинг (новые пиксели от других + актуальная квота) —
  useEffect(() => {
    if (!config) return;
    const id = setInterval(() => {
      void pixelArtApi.get(lastSyncRef.current, token).then((res) => {
        if (!res.data) return;
        lastSyncRef.current = res.data.serverTime;
        setQuota(res.data.quota);
        let changed = false;
        for (const p of res.data.pixels) {
          pixelsRef.current.set(keyOf(p.x, p.y), p.c);
          drawCell(p.x, p.y, p.c);
          changed = true;
        }
        if (changed) drawMag();
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [config, token, drawCell, drawMag]);

  // — клик по полотну → выбор клетки —
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv || !config) return;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * config.grid);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * config.grid);
    if (x < 0 || y < 0 || x >= config.grid || y >= config.grid) return;
    setSel({ x, y });
    setLimitMsg(null);
  }, [config]);

  // — подтверждение закраски —
  const handleConfirm = useCallback(() => {
    if (!sel || !color || submitting) return;
    setSubmitting(true);
    void pixelArtApi.paint(sel.x, sel.y, color, token).then((res) => {
      if (res.data?.ok) {
        pixelsRef.current.set(keyOf(sel.x, sel.y), color);
        drawCell(sel.x, sel.y, color);
        setQuota(res.data.quota);
        setFlash(`Клетка (${sel.x}, ${sel.y}) закрашена`);
        setSel(null);
        setTimeout(() => setFlash(null), 2200);
      } else if (res.status === 429 || res.code === 'PIXEL_LIMIT_REACHED') {
        setLimitMsg(res.message || res.error || 'Дневной лимит исчерпан. Возвращайтесь после 00:00.');
        // обновим квоту
        void pixelArtApi.get(lastSyncRef.current, token).then((r) => { if (r.data) setQuota(r.data.quota); });
      } else {
        setLimitMsg(res.error || 'Не удалось закрасить клетку');
      }
    }).finally(() => setSubmitting(false));
  }, [sel, color, submitting, token, drawCell]);

  const zoomIn = () => setScale((s) => ZOOMS[Math.min(ZOOMS.indexOf(s) + 1, ZOOMS.length - 1)] ?? s);
  const zoomOut = () => setScale((s) => ZOOMS[Math.max(ZOOMS.indexOf(s) - 1, 0)] ?? s);

  const remaining = quota?.remaining ?? 0;
  const limit = quota?.limit ?? config?.freeDaily ?? 20;
  const used = quota?.used ?? 0;
  const canConfirm = !!sel && !!color && remaining > 0 && !submitting;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  const palette = useMemo(() => config?.palette ?? [], [config]);

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        icon={Palette}
        title="Пиксель-арт"
        subtitle="Общее полотно для всех. Выберите клетку, цвет — и оставьте свой след. Холст обновляется в реальном времени и архивируется каждый месяц."
        accent="from-fuchsia-500 to-violet-600"
        actions={
          <Link to="/archive" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border bg-background font-semibold hover:bg-muted transition-colors">
            <ImageIcon className="w-4 h-4" /> Архив
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ХОЛСТ */}
        <div className="min-w-0">
          <div className="rounded-3xl border bg-card/60 p-3 sm:p-4 shadow-sm">
            {/* тулбар */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale === ZOOMS[0]} title="Отдалить" className="h-9 w-9"><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-sm font-semibold tabular-nums w-12 text-center">{scale}×</span>
                <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale === ZOOMS[ZOOMS.length - 1]} title="Приблизить" className="h-9 w-9"><ZoomIn className="w-4 h-4" /></Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="tabular-nums">{grid}×{grid}</span>
                <button onClick={initialLoad} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors" title="Обновить полотно">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
                </button>
              </div>
            </div>

            {/* область прокрутки с полотном */}
            <div className="relative overflow-auto rounded-2xl border bg-[conic-gradient(#f1f5f9_90deg,#e2e8f0_0_180deg,#f1f5f9_0_270deg,#e2e8f0_0)] [background-size:16px_16px] max-h-[68vh]">
              {loading && !config ? (
                <div className="h-[420px] flex items-center justify-center text-muted-foreground">Загружаем полотно…</div>
              ) : error ? (
                <div className="h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <p>{error}</p>
                  <Button onClick={initialLoad} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Повторить</Button>
                </div>
              ) : (
                <div className="relative" style={{ width: grid * scale, height: grid * scale }}>
                  <canvas
                    ref={canvasRef}
                    width={grid}
                    height={grid}
                    onClick={handleClick}
                    className="block cursor-crosshair"
                    style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                  />
                  {sel && (
                    <div
                      className="absolute pointer-events-none ring-2 ring-rose-500 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]"
                      style={{ left: sel.x * scale, top: sel.y * scale, width: scale, height: scale }}
                    />
                  )}
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Кликните по клетке, чтобы выбрать её. Используйте зум для точности. Затем выберите цвет и подтвердите.
            </p>
          </div>
        </div>

        {/* ПАНЕЛЬ ИНСТРУМЕНТОВ */}
        <div className="space-y-5">
          {/* Лимит */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-fuchsia-500" />Ваш лимит</h3>
              <span className="text-sm font-semibold tabular-nums">{remaining} / {limit}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Закрашено сегодня: {used}</span>
              {quota?.resetAt && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />сброс в {fmtTime(quota.resetAt)}</span>}
            </div>
            {quota && quota.bonus > 0 && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">+{quota.bonus} докупленных пикселей сегодня</p>
            )}
            {limitMsg && (
              <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {limitMsg}
              </div>
            )}
          </div>

          {/* Палитра */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-violet-500" />Палитра</h3>
            <div className="grid grid-cols-8 gap-2">
              {palette.map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    aria-label={`Цвет ${c}`}
                    aria-pressed={active}
                    className={`aspect-square rounded-lg border transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'ring-2 ring-offset-2 ring-fuchsia-500 scale-110 border-transparent' : 'border-black/10'}`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>

          {/* Лупа + подтверждение */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <h3 className="font-bold mb-3">Предпросмотр</h3>
            <div className="flex items-start gap-4">
              <canvas
                ref={magRef}
                width={MAG_CELLS * MAG_CELL_PX}
                height={MAG_CELLS * MAG_CELL_PX}
                className="rounded-xl border bg-slate-900 shrink-0"
                style={{ width: MAG_CELLS * MAG_CELL_PX, height: MAG_CELLS * MAG_CELL_PX, imageRendering: 'pixelated' }}
              />
              <div className="min-w-0 text-sm space-y-1.5">
                <p className="text-muted-foreground">Клетка</p>
                <p className="font-semibold tabular-nums">{sel ? `(${sel.x}, ${sel.y})` : '— не выбрана'}</p>
                <p className="text-muted-foreground mt-2">Цвет</p>
                <p className="font-semibold flex items-center gap-2">
                  {color ? <><span className="w-4 h-4 rounded border border-black/10 inline-block" style={{ backgroundColor: color }} />{color}</> : '— не выбран'}
                </p>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full mt-4 btn-shine gap-2"
              size="lg"
            >
              <Check className="w-5 h-5" />
              {submitting ? 'Закрашиваем…' : 'Подтвердить'}
            </Button>
            {!canConfirm && remaining <= 0 && quota && (
              <p className="mt-2 text-xs text-center text-muted-foreground">Лимит на сегодня исчерпан — сброс в {fmtTime(quota.resetAt)}</p>
            )}
            {flash && <p className="mt-2 text-xs text-center text-emerald-600 dark:text-emerald-400">{flash}</p>}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed px-1">
            Полотно общее и сохраняется на сервере. 1-го числа каждого месяца оно архивируется в
            картинку и начинается заново — прошлые месяцы можно посмотреть в{' '}
            <Link to="/archive" className="underline hover:text-foreground">архиве</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PixelArtPage;
