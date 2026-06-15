/**
 * BuyPixelsCard — докупка пикселей для общего полотна за валюту мини-игры.
 *
 * Показывается ТОЛЬКО на страницах рулетки/блэкджека (где есть игровой баланс).
 * На самой странице пиксель-арта этот обмен не доступен. Курс и лимит приходят
 * с бэкенда; списание валюты и потолок докупки защищены на сервере.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette, Minus, Plus, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { pixelArtApi } from '@/lib/api/client';

export function BuyPixelsCard({
  game, balance, currency, accent, onSpent,
}: {
  game: 'roulette' | 'blackjack';
  balance: number;
  currency: string;
  accent: string; // tailwind from-... для иконки/акцента
  onSpent: (newBalance: number) => void;
}) {
  const token = useAppStore((s) => s.token);
  const [price, setPrice] = useState(1000);
  const [cap, setCap] = useState(20);
  const [boughtToday, setBoughtToday] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadInfo = useCallback(() => {
    if (!token) return;
    void pixelArtApi.purchaseInfo(token).then((r) => {
      if (r.data) {
        setPrice(r.data.pixelPrice);
        setCap(r.data.bonusCap);
        setBoughtToday(r.data.quota.bonus);
      }
    });
  }, [token]);
  useEffect(loadInfo, [loadInfo]);

  const remainingCap = Math.max(0, cap - boughtToday);
  const maxAffordable = Math.floor(balance / price);
  const maxQty = Math.max(0, Math.min(remainingCap, maxAffordable));
  const clampedQty = Math.min(qty, Math.max(1, maxQty));
  const cost = clampedQty * price;
  const canBuy = !!token && maxQty >= 1 && clampedQty >= 1 && cost <= balance && !busy;

  const buy = () => {
    if (!token || !canBuy) return;
    setBusy(true);
    setMsg(null);
    void pixelArtApi.purchase(game, clampedQty, token).then((r) => {
      if (r.data?.ok) {
        onSpent(r.data.balance);
        setBoughtToday(r.data.quota.bonus);
        setQty(1);
        setMsg({ kind: 'ok', text: `+${r.data.bought} пикселей! Рисуйте на полотне.` });
      } else {
        setMsg({ kind: 'err', text: r.error || 'Не удалось купить пиксели' });
      }
    }).finally(() => setBusy(false));
  };

  if (!token) return null; // докупка только для авторизованных (есть игровой баланс)

  return (
    <div className="rounded-2xl border bg-card/60 p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-1">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0`}>
          <Palette className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold leading-tight">Пиксели для арта</h3>
          <p className="text-xs text-muted-foreground">1 пиксель = {price.toLocaleString('ru-RU')} {currency}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-2">
        Обменяйте {currency} на пиксели для{' '}
        <Link to="/pixel-art" className="underline hover:text-foreground inline-flex items-center gap-0.5">
          общего полотна <ExternalLink className="w-3 h-3" />
        </Link>. Сегодня докуплено {boughtToday}/{cap}.
      </p>

      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={busy || clampedQty <= 1}>
          <Minus className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-extrabold tabular-nums leading-none">{clampedQty}</div>
          <div className="text-xs text-muted-foreground mt-0.5">пикс. за {cost.toLocaleString('ru-RU')} {currency}</div>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={busy || clampedQty >= maxQty}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Button onClick={buy} disabled={!canBuy} className="w-full mt-3 gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
        Купить за {cost.toLocaleString('ru-RU')} {currency}
      </Button>

      {maxQty < 1 && (
        <p className="mt-2 text-xs text-center text-muted-foreground">
          {remainingCap < 1 ? `Дневной лимит докупки исчерпан (${cap}).` : `Недостаточно ${currency} (нужно ${price.toLocaleString('ru-RU')}).`}
        </p>
      )}
      {msg && (
        <p className={`mt-2 text-xs text-center ${msg.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

export default BuyPixelsCard;
