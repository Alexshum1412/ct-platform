import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Users, MousePointerClick, Crown, Coins, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { referralApi, type ReferralMe } from '@/lib/api/client';

/** Блок «Рефералы» в личном кабинете: личный код, ссылка, статистика, история. */
export function ReferralCard() {
  const token = useAppStore((s) => s.token);
  const [data, setData] = useState<ReferralMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    void referralApi.me(token).then((r) => {
      if (r.data) setData(r.data);
      else setError(r.error || 'Не удалось загрузить реферальные данные');
    }).finally(() => setLoading(false));
  };

  useEffect(fetchMe, [token]);

  const link = data ? `${window.location.origin}/register?ref=${data.code}` : '';

  const copy = async (text: string, what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard недоступен */ }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'CT-Platform', text: 'Готовься к ЦТ/ЦЭ со скидкой 15%', url: link }); } catch { /* отменено */ }
    } else {
      void copy(link, 'link');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="h-12 bg-muted rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Gift className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">{error || 'Реферальные данные недоступны'}</p>
          <Button variant="outline" onClick={fetchMe}>Повторить</Button>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { icon: MousePointerClick, label: 'Переходы', value: data.stats.clicks, color: 'text-blue-500' },
    { icon: Users, label: 'Регистрации', value: data.stats.signups, color: 'text-violet-500' },
    { icon: Crown, label: 'Оформили Premium', value: data.stats.conversions, color: 'text-amber-500' },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />Реферальная программа
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Пригласите друзей — они получат <span className="font-semibold text-foreground">скидку {data.discountPct}%</span> на
          первую покупку Premium по вашему коду.
        </p>

        {/* Личная скидка, если пользователь сам пришёл по коду */}
        {data.myDiscount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
            <Gift className="w-4 h-4 shrink-0" />
            У вас есть скидка <span className="font-semibold">{data.myDiscount}%</span> на первую покупку Premium.
          </div>
        )}

        {/* Код */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ваш код</label>
          <div className="flex gap-2">
            <div className="flex-1 font-mono text-lg font-bold tracking-wider rounded-lg border border-border bg-muted/50 px-4 py-2.5 select-all">
              {data.code}
            </div>
            <Button variant="outline" onClick={() => copy(data.code, 'code')} className="shrink-0 gap-1.5">
              {copied === 'code' ? <><Check className="w-4 h-4 text-green-500" />Скопировано</> : <><Copy className="w-4 h-4" />Код</>}
            </Button>
          </div>
        </div>

        {/* Ссылка */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ссылка-приглашение</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 text-sm rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-muted-foreground"
            />
            <Button variant="outline" onClick={() => copy(link, 'link')} className="shrink-0 gap-1.5">
              {copied === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button onClick={share} className="shrink-0 gap-1.5">
              <Share2 className="w-4 h-4" /><span className="hidden sm:inline">Поделиться</span>
            </Button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {data.stats.revenue > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="w-4 h-4 text-amber-500" />
            Принесли платформе: <span className="font-semibold text-foreground">{Math.round(data.stats.revenue)} BYN</span>
          </div>
        )}

        {/* История приглашений */}
        {data.referrals.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Приглашённые ({data.referrals.length})</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm rounded-lg bg-muted/40 px-3 py-2">
                  <span className="font-medium truncate">{r.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                    {r.status === 'CONVERTED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <Crown className="w-3.5 h-3.5" />Premium
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">регистрация</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReferralCard;
