import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, AlertTriangle, Wrench, Megaphone, CheckCircle2, X } from 'lucide-react';
import { bannersApi, type Banner } from '@/lib/api/client';

const TYPE_META: Record<string, { cls: string; icon: typeof Info }> = {
  info: { cls: 'bg-blue-600 text-white', icon: Info },
  warning: { cls: 'bg-amber-500 text-white', icon: AlertTriangle },
  maintenance: { cls: 'bg-orange-600 text-white', icon: Wrench },
  promo: { cls: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white', icon: Megaphone },
  success: { cls: 'bg-emerald-600 text-white', icon: CheckCircle2 },
};
const SIZE_PAD: Record<string, string> = { small: 'py-1.5 text-sm', medium: 'py-2.5', large: 'py-4 text-lg' };
const DISMISS_KEY = 'ct-dismissed-banners';

function loadDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}

/** Показ активных баннеров (ЧП/техработы/реклама) — данные из админки. */
export function BannerDisplay() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);

  useEffect(() => {
    void bannersApi.active().then((r) => { if (r.data?.items) setBanners(r.data.items); });
  }, []);

  const dismiss = (id: string) => {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next.slice(-200))); } catch { /* */ }
  };

  const visible = banners.filter((b) => !(b.dismissible && dismissed.includes(b.id)));
  const top = visible.filter((b) => b.location === 'top');
  const bottom = visible.filter((b) => b.location === 'bottom');
  const modal = visible.filter((b) => b.location === 'modal');

  const Bar = ({ b, fixed }: { b: Banner; fixed?: boolean }) => {
    const meta = TYPE_META[b.type] ?? TYPE_META.info;
    return (
      <motion.div
        initial={{ opacity: 0, y: fixed ? 20 : -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={`${meta.cls} ${fixed ? 'shadow-lg' : ''}`}
      >
        <div className={`container ${SIZE_PAD[b.size] ?? SIZE_PAD.medium} flex items-center gap-3`}>
          <meta.icon className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold">{b.title}</span>
            {b.content && <span className="opacity-90"> — {b.content}</span>}
            {b.linkUrl && b.linkLabel && (
              <Link to={b.linkUrl} className="ml-2 underline font-medium whitespace-nowrap">{b.linkLabel}</Link>
            )}
          </div>
          {b.dismissible && (
            <button onClick={() => dismiss(b.id)} className="shrink-0 p-1 rounded hover:bg-black/15 transition-colors" aria-label="Закрыть">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {top.length > 0 && <div className="relative z-40"><AnimatePresence>{top.map((b) => <Bar key={b.id} b={b} />)}</AnimatePresence></div>}

      {bottom.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-[55]"><AnimatePresence>{bottom.map((b) => <Bar key={b.id} b={b} fixed />)}</AnimatePresence></div>
      )}

      <AnimatePresence>
        {modal.length > 0 && (() => {
          const b = modal[0];
          const meta = TYPE_META[b.type] ?? TYPE_META.info;
          return (
            <motion.div
              className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => b.dismissible && dismiss(b.id)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                <div className={`${meta.cls} px-5 py-4 flex items-center gap-3`}>
                  <meta.icon className="w-6 h-6 shrink-0" />
                  <h3 className="font-bold text-lg flex-1">{b.title}</h3>
                  {b.dismissible && <button onClick={() => dismiss(b.id)} aria-label="Закрыть"><X className="w-5 h-5" /></button>}
                </div>
                {b.imageUrl && <img src={b.imageUrl} alt="" className="w-full max-h-60 object-cover" />}
                <div className="p-5">
                  <p className="text-foreground/90 whitespace-pre-wrap">{b.content}</p>
                  {b.linkUrl && b.linkLabel && (
                    <Link to={b.linkUrl} onClick={() => b.dismissible && dismiss(b.id)} className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{b.linkLabel}</Link>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}

export default BannerDisplay;
