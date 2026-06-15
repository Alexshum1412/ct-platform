/**
 * PixelArchivePage — архив совместного полотна. 1-го числа каждого месяца снимок
 * полотна сохраняется в PNG, а холст начинается заново. Здесь — история по месяцам.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Download, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { API_URL, pixelArtApi, type PixelArchiveItem } from '@/lib/api/client';

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
function monthLabel(m: string) {
  const [y, mm] = m.split('-').map(Number);
  return `${MONTHS[(mm || 1) - 1] ?? m} ${y}`;
}

export function PixelArchivePage() {
  const [items, setItems] = useState<PixelArchiveItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    void pixelArtApi.archive().then((res) => {
      if (res.data) setItems(res.data.archives);
      else setError(res.error || 'Не удалось загрузить архив');
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="container py-8 md:py-10">
      <PageHeader
        icon={ImageIcon}
        title="Архив пиксель-арта"
        subtitle="Снимки общего полотна по месяцам. Каждый месяц холст сохраняется в картинку и начинается заново."
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
              <div className="aspect-square bg-[conic-gradient(#f1f5f9_90deg,#e2e8f0_0_180deg,#f1f5f9_0_270deg,#e2e8f0_0)] [background-size:16px_16px]">
                <img
                  src={a.png}
                  alt={`Полотно за ${monthLabel(a.month)}`}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold capitalize truncate">{monthLabel(a.month)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{a.pixels.toLocaleString('ru-RU')} клеток</p>
                </div>
                <a
                  href={`${API_URL}/api/pixel-art/archive/${a.month}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border bg-background text-sm font-semibold hover:bg-muted transition-colors shrink-0"
                  title="Открыть PNG"
                >
                  <Download className="w-4 h-4" /> PNG
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PixelArchivePage;
