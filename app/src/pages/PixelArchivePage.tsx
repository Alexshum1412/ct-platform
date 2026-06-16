/**
 * PixelArchivePage — архив совместного полотна. 1-го числа каждого месяца снимок
 * полотна сохраняется в PNG, а холст начинается заново. Здесь — история по месяцам,
 * с предпросмотром и скачиванием оформленной (в рамке) версии.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Download, Palette, RefreshCw, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { pixelArtApi, type PixelArchiveItem } from '@/lib/api/client';
import { buildFramedCanvas, downloadCanvas, loadImage, monthTitle } from '@/lib/pixelFrame';

export function PixelArchivePage() {
  const [items, setItems] = useState<PixelArchiveItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ src: string; month: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void pixelArtApi.archive().then((res) => {
      if (res.data) setItems(res.data.archives);
      else setError(res.error || 'Не удалось загрузить архив');
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const framedOf = async (a: PixelArchiveItem) => {
    const img = await loadImage(a.png);
    return buildFramedCanvas(img, { month: a.month, subtitle: `Архив за ${monthTitle(a.month)}` });
  };

  const openPreview = async (a: PixelArchiveItem) => {
    setBusy(a.month);
    try { setPreview({ src: (await framedOf(a)).toDataURL('image/png'), month: a.month }); }
    finally { setBusy(null); }
  };
  const download = async (a: PixelArchiveItem) => {
    setBusy(a.month);
    try { downloadCanvas(await framedOf(a), `ct-platform-pixel-art-${a.month}.png`); }
    finally { setBusy(null); }
  };

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        icon={ImageIcon}
        title="Архив пиксель-арта"
        subtitle="Снимки общего полотна по месяцам. Каждый месяц холст сохраняется в картинку и начинается заново. Любой можно скачать в красивой рамке."
        accent="from-fuchsia-500 to-violet-600"
        back={{ to: '/pixel-art', label: 'К полотну' }}
        actions={
          <Link to="/pixel-art" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border bg-background font-semibold hover:bg-muted transition-colors">
            <Palette className="w-4 h-4" /> Рисовать
          </Link>
        }
      />

      {loading && !items ? (
        <div className="py-20 text-center text-muted-foreground">Загружаем архив…</div>
      ) : error ? (
        <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
          <p>{error}</p>
          <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Повторить</Button>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-1">Архив пока пуст</h2>
          <p className="text-muted-foreground mb-5 max-w-md mx-auto">
            Первый снимок появится здесь 1-го числа следующего месяца. А пока — оставьте свой след на полотне.
          </p>
          <Link to="/pixel-art" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors">
            <Palette className="w-4 h-4" /> Открыть полотно
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((a) => (
            <div key={a.month} className="rounded-2xl border bg-card/60 overflow-hidden shadow-sm card-lift">
              <button
                onClick={() => openPreview(a)}
                className="block w-full aspect-square bg-[conic-gradient(#f1f5f9_90deg,#e2e8f0_0_180deg,#f1f5f9_0_270deg,#e2e8f0_0)] [background-size:16px_16px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Предпросмотр в рамке"
              >
                <img src={a.png} alt={`Полотно за ${monthTitle(a.month)}`} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} loading="lazy" />
              </button>
              <div className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold capitalize truncate">{monthTitle(a.month)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{a.pixels.toLocaleString('ru-RU')} клеток</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button onClick={() => openPreview(a)} variant="outline" size="icon" className="h-9 w-9" title="Предпросмотр" disabled={busy === a.month}>
                    {busy === a.month ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => download(a)} size="icon" className="h-9 w-9" title="Скачать в рамке" disabled={busy === a.month}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Предпросмотр оформленной версии */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-4" onClick={() => setPreview(null)} role="dialog" aria-modal="true">
          <img src={preview.src} alt={`Полотно за ${monthTitle(preview.month)}`} className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <a href={preview.src} download={`ct-platform-pixel-art-${preview.month}.png`} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />Скачать PNG
            </a>
            <Button variant="outline" onClick={() => setPreview(null)}>Закрыть</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PixelArchivePage;
