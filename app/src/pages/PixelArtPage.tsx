/**
 * PixelArtPage — скрытая страница совместного пиксель-арта (в духе r/place).
 *
 * Ссылка на страницу — ТОЛЬКО в подвале рядом с «Политикой конфиденциальности».
 * Полотно общее (сервер), обновляется у всех без перезагрузки (инкрементальный
 * поллинг). Поток: выбрать клетку(и) инструментом → цвет → подтвердить.
 * Инструменты: точка / линия / прямоугольник + размер кисти. Лимит закраски (по IP)
 * проверяется на бэкенде. Докупка пикселей живёт ТОЛЬКО на страницах мини-игр.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette, ZoomIn, ZoomOut, Check, RefreshCw, Info, Sparkles, Clock, Image as ImageIcon,
  Grid3x3, Pencil, Minus, Square, Eraser, Trophy, Download, Trash2, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { useAppStore } from '@/store/useAppStore';
import { pixelArtApi, type PixelConfig, type PixelQuota, type PixelLeaderboard } from '@/lib/api/client';
import { buildFramedCanvas, downloadCanvas, monthTitle } from '@/lib/pixelFrame';

const POLL_MS = 4000;
const ZOOMS = [1, 2, 4, 8, 16];
const MAX_PENDING = 400;
const RECENT_KEY = 'ct-pixel-recent';

type Tool = 'point' | 'line' | 'rect';
const keyOf = (x: number, y: number) => `${x},${y}`;

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); } catch { return '00:00'; }
}

// — геометрия выделения —
function blockCells(cx: number, cy: number, brush: number, grid: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let dy = 0; dy < brush; dy++) for (let dx = 0; dx < brush; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x >= 0 && y >= 0 && x < grid && y < grid) out.push({ x, y });
  }
  return out;
}
function lineCells(a: { x: number; y: number }, b: { x: number; y: number }, brush: number, grid: number) {
  const cells = new Map<string, { x: number; y: number }>();
  let x0 = a.x, y0 = a.y; const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 5000; guard++) {
    for (const c of blockCells(x0, y0, brush, grid)) cells.set(keyOf(c.x, c.y), c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return [...cells.values()];
}
function rectCells(a: { x: number; y: number }, b: { x: number; y: number }, grid: number) {
  const out: { x: number; y: number }[] = [];
  const x0 = Math.max(0, Math.min(a.x, b.x)), x1 = Math.min(grid - 1, Math.max(a.x, b.x));
  const y0 = Math.max(0, Math.min(a.y, b.y)), y1 = Math.min(grid - 1, Math.max(a.y, b.y));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    out.push({ x, y });
    if (out.length > MAX_PENDING) return out;
  }
  return out;
}

export function PixelArtPage() {
  const token = useAppStore((s) => s.token);

  const [config, setConfig] = useState<PixelConfig | null>(null);
  const [quota, setQuota] = useState<PixelQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [tool, setTool] = useState<Tool>('point');
  const [brush, setBrush] = useState(1);
  const [color, setColor] = useState('#000000');
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  });

  const [pending, setPending] = useState<{ x: number; y: number }[]>([]);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [lb, setLb] = useState<PixelLeaderboard | null>(null);
  const [lbMonth, setLbMonth] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const pixelsRef = useRef<Map<string, string>>(new Map());
  const lastSyncRef = useRef<string | null>(null);
  const [boxW, setBoxW] = useState(0);

  const grid = config?.grid ?? 500;
  const pxPerCell = boxW > 0 ? (boxW * zoom) / grid : 0;

  // — измеряем доступную ширину, чтобы при 1× холст занимал ВСЮ область —
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // — отрисовка committed-слоя —
  const drawBaseCell = useCallback((x: number, y: number, c: string) => {
    const ctx = baseRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
  }, []);
  const drawBaseAll = useCallback(() => {
    const ctx = baseRef.current?.getContext('2d');
    if (!ctx || !config) return;
    ctx.fillStyle = config.startFill;
    ctx.fillRect(0, 0, config.grid, config.grid);
    pixelsRef.current.forEach((c, k) => { const [x, y] = k.split(',').map(Number); ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); });
  }, [config]);

  // — отрисовка превью выделения (pending) —
  const drawOverlay = useCallback(() => {
    const ctx = overlayRef.current?.getContext('2d');
    if (!ctx || !config) return;
    ctx.clearRect(0, 0, config.grid, config.grid);
    for (const c of pending) { ctx.fillStyle = color; ctx.globalAlpha = 0.7; ctx.fillRect(c.x, c.y, 1, 1); }
    ctx.globalAlpha = 1;
  }, [pending, color, config]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

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
      } else setError(res.error || 'Не удалось загрузить полотно');
    }).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { initialLoad(); }, [initialLoad]);
  useEffect(() => { if (config) requestAnimationFrame(drawBaseAll); }, [config, drawBaseAll]);

  // — рейтинг вкладчиков —
  const loadLb = useCallback(() => {
    void pixelArtApi.leaderboard(lbMonth, token).then((r) => { if (r.data) setLb(r.data); });
  }, [lbMonth, token]);
  useEffect(() => { loadLb(); }, [loadLb]);

  // — инкрементальный поллинг —
  useEffect(() => {
    if (!config) return;
    const id = setInterval(() => {
      void pixelArtApi.get(lastSyncRef.current, token).then((res) => {
        if (!res.data) return;
        lastSyncRef.current = res.data.serverTime;
        setQuota(res.data.quota);
        for (const p of res.data.pixels) { pixelsRef.current.set(keyOf(p.x, p.y), p.c); drawBaseCell(p.x, p.y, p.c); }
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [config, token, drawBaseCell]);

  // — клик по полотну —
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = overlayRef.current;
    if (!cv || !config) return;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * config.grid);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * config.grid);
    if (x < 0 || y < 0 || x >= config.grid || y >= config.grid) return;
    setLimitMsg(null);

    if (tool === 'point') {
      setPending(blockCells(x, y, brush, config.grid));
      setAnchor(null);
    } else if (tool === 'line') {
      if (!anchor) { setAnchor({ x, y }); setPending(blockCells(x, y, brush, config.grid)); }
      else setPending(lineCells(anchor, { x, y }, brush, config.grid).slice(0, MAX_PENDING));
    } else { // rect
      if (!anchor) { setAnchor({ x, y }); setPending(blockCells(x, y, brush, config.grid)); }
      else setPending(rectCells(anchor, { x, y }, config.grid));
    }
  }, [config, tool, brush, anchor]);

  const clearSelection = () => { setPending([]); setAnchor(null); };

  const pushRecent = (c: string) => {
    setRecent((prev) => {
      const next = [c, ...prev.filter((x) => x.toUpperCase() !== c.toUpperCase())].slice(0, 12);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // — подтверждение закраски —
  const handleConfirm = useCallback(() => {
    if (!pending.length || submitting) return;
    setSubmitting(true);
    const cells = pending.map((p) => ({ x: p.x, y: p.y, c: color }));
    void pixelArtApi.paintBatch(cells, token).then((res) => {
      if (res.data?.ok) {
        for (const p of res.data.pixels) { pixelsRef.current.set(keyOf(p.x, p.y), p.c); drawBaseCell(p.x, p.y, p.c); }
        setQuota(res.data.quota);
        pushRecent(color);
        const { placed, requested } = res.data;
        setFlash(placed < requested ? `Закрашено ${placed} из ${requested} (лимит)` : `Закрашено клеток: ${placed}`);
        clearSelection();
        setTimeout(() => setFlash(null), 2600);
        loadLb();
      } else if (res.status === 429 || res.code === 'PIXEL_LIMIT_REACHED') {
        setLimitMsg(res.message || res.error || 'Дневной лимит исчерпан. Возвращайтесь после 00:00.');
        void pixelArtApi.get(lastSyncRef.current, token).then((r) => { if (r.data) setQuota(r.data.quota); });
      } else setLimitMsg(res.error || 'Не удалось закрасить');
    }).finally(() => setSubmitting(false));
  }, [pending, color, submitting, token, drawBaseCell, loadLb]);

  const zoomIn = () => setZoom((z) => ZOOMS[Math.min(ZOOMS.indexOf(z) + 1, ZOOMS.length - 1)] ?? z);
  const zoomOut = () => setZoom((z) => ZOOMS[Math.max(ZOOMS.indexOf(z) - 1, 0)] ?? z);

  const openPreview = () => {
    if (!baseRef.current || !config) return;
    const framed = buildFramedCanvas(baseRef.current, { month: lb?.month || new Date().toISOString().slice(0, 7) });
    setPreview(framed.toDataURL('image/png'));
  };
  const downloadCurrent = () => {
    if (!baseRef.current) return;
    const month = lb?.month || new Date().toISOString().slice(0, 7);
    downloadCanvas(buildFramedCanvas(baseRef.current, { month }), `ct-platform-pixel-art-${month}.png`);
  };

  const remaining = quota?.remaining ?? 0;
  const limit = quota?.limit ?? config?.freeDaily ?? 20;
  const used = quota?.used ?? 0;
  const willPlace = Math.min(pending.length, remaining);
  const canConfirm = pending.length > 0 && remaining > 0 && !submitting;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const palette = useMemo(() => config?.palette ?? [], [config]);

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        icon={Palette}
        title="Пиксель-арт"
        subtitle="Общее полотно для всех. Выбирайте клетки инструментом, цвет — и оставляйте свой след. Холст обновляется в реальном времени и архивируется каждый месяц."
        accent="from-fuchsia-500 to-violet-600"
        actions={
          <Link to="/archive" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border bg-background font-semibold hover:bg-muted transition-colors">
            <ImageIcon className="w-4 h-4" /> Архив
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ХОЛСТ */}
        <div className="min-w-0">
          <div className="rounded-3xl border bg-card/60 p-3 sm:p-4 shadow-sm">
            {/* тулбар */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" onClick={zoomOut} disabled={zoom === ZOOMS[0]} title="Отдалить" className="h-9 w-9"><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-sm font-semibold tabular-nums w-10 text-center">{zoom}×</span>
                <Button variant="outline" size="icon" onClick={zoomIn} disabled={zoom === ZOOMS[ZOOMS.length - 1]} title="Приблизить" className="h-9 w-9"><ZoomIn className="w-4 h-4" /></Button>
                <Button variant={showGrid ? 'default' : 'outline'} size="icon" onClick={() => setShowGrid((s) => !s)} title="Сетка" className="h-9 w-9 ml-1"><Grid3x3 className="w-4 h-4" /></Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <button onClick={openPreview} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors" title="Предпросмотр и скачивание">
                  <ImageIcon className="w-4 h-4" /> Превью
                </button>
                <button onClick={initialLoad} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors" title="Обновить полотно">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
                </button>
              </div>
            </div>

            {/* область с полотном — выделенные границы (рамка) для ориентира */}
            <div
              ref={boxRef}
              className="relative overflow-auto rounded-xl ring-2 ring-primary/40 bg-[conic-gradient(#f1f5f9_90deg,#e2e8f0_0_180deg,#f1f5f9_0_270deg,#e2e8f0_0)] [background-size:16px_16px] max-h-[72vh]"
            >
              {loading && !config ? (
                <div className="h-[420px] flex items-center justify-center text-muted-foreground">Загружаем полотно…</div>
              ) : error ? (
                <div className="h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <p>{error}</p>
                  <Button onClick={initialLoad} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Повторить</Button>
                </div>
              ) : (
                <div className="relative mx-auto" style={{ width: boxW ? boxW * zoom : '100%', height: boxW ? boxW * zoom : 'auto' }}>
                  <canvas ref={baseRef} width={grid} height={grid} className="block" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
                  <canvas
                    ref={overlayRef}
                    width={grid}
                    height={grid}
                    onClick={handleClick}
                    className="absolute inset-0 cursor-crosshair"
                    style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                  />
                  {showGrid && pxPerCell >= 4 && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: 'linear-gradient(to right, rgba(15,23,42,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.18) 1px, transparent 1px)',
                        backgroundSize: `${pxPerCell}px ${pxPerCell}px`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {tool === 'point' && 'Кликните клетку, выберите цвет и подтвердите. Зум и сетка помогут целиться.'}
              {tool === 'line' && (anchor ? 'Кликните вторую точку — получится линия. Затем подтвердите.' : 'Кликните начальную точку линии.')}
              {tool === 'rect' && (anchor ? 'Кликните противоположный угол прямоугольника, затем подтвердите.' : 'Кликните первый угол прямоугольника.')}
            </p>
          </div>
        </div>

        {/* ПАНЕЛЬ */}
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
            {quota && quota.bonus > 0 && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">+{quota.bonus} докупленных пикселей сегодня</p>}
            {limitMsg && <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">{limitMsg}</div>}
          </div>

          {/* Инструменты */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Pencil className="w-4 h-4 text-violet-500" />Инструмент</h3>
            <div className="grid grid-cols-3 gap-2">
              {([['point', 'Точка', Eraser], ['line', 'Линия', Minus], ['rect', 'Прямоуг.', Square]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => { setTool(id); clearSelection(); }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${tool === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Кисть</span>
              <div className="inline-flex rounded-lg border overflow-hidden">
                {[1, 2, 3, 4].map((b) => (
                  <button key={b} onClick={() => setBrush(b)} className={`w-9 h-8 text-sm font-semibold tabular-nums ${brush === b ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>{b}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Палитра + RGB + недавние */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-violet-500" />Цвет</h3>
            <div className="grid grid-cols-8 gap-2">
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  aria-label={`Цвет ${c}`}
                  className={`aspect-square rounded-lg border transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${color.toUpperCase() === c.toUpperCase() ? 'ring-2 ring-offset-2 ring-fuchsia-500 scale-110 border-transparent' : 'border-black/10'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Расширенная RGB-палитра */}
            <div className="mt-4 flex items-center gap-3">
              <label className="relative w-11 h-11 rounded-xl overflow-hidden border cursor-pointer shrink-0" title="Выбрать любой цвет">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] cursor-pointer" />
                <span className="absolute inset-0" style={{ backgroundColor: color }} />
              </label>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Любой цвет (RGB)</p>
                <input
                  value={color}
                  onChange={(e) => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v.toUpperCase()); }}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border bg-background font-mono text-sm uppercase"
                  maxLength={7}
                  spellCheck={false}
                />
              </div>
            </div>

            {recent.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1.5">Недавние</p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((c) => (
                    <button key={c} onClick={() => setColor(c)} title={c} className="w-7 h-7 rounded-md border border-black/10 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Подтверждение */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Выбрано клеток</span>
              <span className="font-bold tabular-nums">{pending.length}{pending.length > remaining && <span className="text-amber-600"> → {willPlace}</span>}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button onClick={handleConfirm} disabled={!canConfirm} className="flex-1 btn-shine gap-2" size="lg">
                <Check className="w-5 h-5" />{submitting ? 'Закрашиваем…' : 'Подтвердить'}
              </Button>
              <Button onClick={clearSelection} variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled={!pending.length} title="Сбросить выделение"><Trash2 className="w-4 h-4" /></Button>
            </div>
            {pending.length > remaining && remaining > 0 && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Будет закрашено {willPlace} (остаток лимита).</p>}
            {remaining <= 0 && quota && <p className="mt-2 text-xs text-center text-muted-foreground">Лимит исчерпан — сброс в {fmtTime(quota.resetAt)}</p>}
            {flash && <p className="mt-2 text-xs text-center text-emerald-600 dark:text-emerald-400">{flash}</p>}
            <Button onClick={downloadCurrent} variant="ghost" size="sm" className="w-full mt-3 gap-2 text-muted-foreground"><Download className="w-4 h-4" />Скачать полотно (PNG)</Button>
          </div>

          {/* Рейтинг вкладчиков за месяц */}
          <div className="rounded-3xl border bg-card/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Рейтинг месяца</h3>
              {lb && lb.months.length > 1 && (
                <select value={lbMonth ?? lb.month} onChange={(e) => setLbMonth(e.target.value)} className="text-xs rounded-lg border bg-background px-2 py-1">
                  {lb.months.map((m) => <option key={m} value={m}>{monthTitle(m)}</option>)}
                </select>
              )}
            </div>
            {!lb || lb.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Пока никто не закрасил ни клетки. Будьте первым!</p>
            ) : (
              <ol className="space-y-1.5">
                {lb.leaderboard.slice(0, 10).map((row) => (
                  <li key={row.userId}>
                    <Link to={`/u/${row.userId}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
                      <span className={`w-6 text-center text-sm font-bold tabular-nums ${row.rank === 1 ? 'text-amber-500' : row.rank <= 3 ? 'text-violet-500' : 'text-muted-foreground'}`}>{row.rank === 1 ? <Crown className="w-4 h-4 mx-auto" /> : row.rank}</span>
                      <span className="flex-1 min-w-0 truncate text-sm font-medium">{row.name}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">{row.count.toLocaleString('ru-RU')}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            {lb?.me && lb.me.rank && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Вы</span>
                <span className="font-semibold">#{lb.me.rank} · {lb.me.count.toLocaleString('ru-RU')} клеток</span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed px-1">
            Полотно общее. 1-го числа каждого месяца оно архивируется в картинку и начинается заново —
            прошлые месяцы в <Link to="/archive" className="underline hover:text-foreground">архиве</Link>.
          </p>
        </div>
      </div>

      {/* Модал предпросмотра/скачивания */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-4" onClick={() => setPreview(null)} role="dialog" aria-modal="true">
          <img src={preview} alt="Предпросмотр полотна" className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Button onClick={downloadCurrent} className="gap-2"><Download className="w-4 h-4" />Скачать PNG</Button>
            <Button variant="outline" onClick={() => setPreview(null)}>Закрыть</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PixelArtPage;
