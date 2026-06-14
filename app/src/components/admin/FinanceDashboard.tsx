import { useEffect, useState } from 'react';
import {
  Wallet, Users, Crown, TrendingUp, Activity, Gift, RefreshCw, Loader2, CircleDot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminFinanceApi, type AdminFinance } from '@/lib/api/client';

const PLAN_LABEL: Record<string, string> = {
  PREMIUM_MONTHLY: 'Месячный',
  PREMIUM_YEARLY: 'Годовой',
};

export function FinanceDashboard({ token }: { token: string | null }) {
  const [data, setData] = useState<AdminFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    void adminFinanceApi.get(token).then((r) => {
      if (r.data) setData(r.data);
      else setError(r.error || 'Не удалось загрузить данные');
    }).finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  if (loading && !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка финансов…</div>;
  }
  if (error) {
    return (
      <Card><CardContent className="p-8 text-center">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={load} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Повторить</Button>
      </CardContent></Card>
    );
  }
  if (!data) return null;

  const maxRev = Math.max(1, ...data.series.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" />Финансы и онлайн</h2>
          <p className="text-sm text-muted-foreground">Доходы, подписки, активность и влияние рефералов</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-1.5 hidden sm:inline">Обновить</span>
        </Button>
      </div>

      {/* Онлайн */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={CircleDot} iconClass="text-green-500" label="Сейчас онлайн" value={data.online.now} hint="активны ≤ 15 мин" pulse />
        <StatCard icon={Activity} iconClass="text-blue-500" label="Активны сегодня" value={data.online.activeToday} hint="решали задания" />
        <StatCard icon={Users} iconClass="text-violet-500" label="Активны за неделю" value={data.online.activeWeek} />
      </div>

      {/* Доходы */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MoneyCard label="Доход всего" value={data.revenue.total} accent />
        <MoneyCard label="За 30 дней" value={data.revenue.month} />
        <MoneyCard label="За неделю" value={data.revenue.week} />
        <MoneyCard label="Сегодня" value={data.revenue.today} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Подписки */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" />Подписки</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Активных подписок" value={data.revenue.activeSubscriptions} />
            <Row label="Всего оплат" value={data.revenue.payments} />
            <Row label="ARPU" value={`${data.revenue.arpu} BYN`} />
            <div className="pt-2 mt-1 border-t space-y-1.5">
              {Object.entries(data.revenue.byPlan).length === 0 && <p className="text-muted-foreground text-xs">Пока нет активных подписок</p>}
              {Object.entries(data.revenue.byPlan).map(([plan, n]) => (
                <Row key={plan} label={PLAN_LABEL[plan] ?? plan} value={n} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Пользователи / конверсия */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />Пользователи</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Всего" value={data.users.total} />
            <Row label="Premium" value={data.users.premium} valueClass="text-amber-600 dark:text-amber-400" />
            <Row label="Конверсия в Premium" value={`${data.users.conversionRate}%`} valueClass="font-semibold" />
            <div className="pt-2 mt-1 border-t space-y-1.5">
              <Row label="Новые сегодня" value={`+${data.users.newToday}`} valueClass="text-green-600" />
              <Row label="Новые за неделю" value={`+${data.users.newWeek}`} valueClass="text-green-600" />
              <Row label="Новые за месяц" value={`+${data.users.newMonth}`} valueClass="text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Рефералы */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-primary" />Рефералы</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Кодов всего" value={data.referrals.codes} />
            <Row label="Из них блогерских" value={data.referrals.bloggerCodes} />
            <Row label="Переходы" value={data.referrals.clicks} />
            <Row label="Регистрации по кодам" value={data.referrals.signups} />
            <Row label="Оплатили Premium" value={data.referrals.conversions} valueClass="text-amber-600 dark:text-amber-400" />
            <div className="pt-2 mt-1 border-t space-y-1.5">
              <Row label="Доля рефералов" value={`${data.referrals.signupShare}%`} />
              <Row label="Выручка рефералов" value={`${Math.round(data.referrals.revenue)} BYN`} valueClass="font-semibold" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* График выручки за 30 дней */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" />Выручка за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[3px] h-40">
            {data.series.map((d) => (
              <div key={d.date} className="group relative flex-1 flex flex-col justify-end h-full">
                <div
                  className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                  style={{ height: `${(d.revenue / maxRev) * 100}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-foreground text-background text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}: {d.revenue} BYN · {d.payments} опл. · +{d.registrations} рег.
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
            <span>{new Date(data.series[0]?.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            <span>сегодня</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, iconClass, label, value, hint, pulse }: {
  icon: React.ComponentType<{ className?: string }>; iconClass: string; label: string; value: number; hint?: string; pulse?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Icon className={`w-4 h-4 ${iconClass} ${pulse ? 'animate-pulse' : ''}`} />{label}
        </div>
        <div className="text-3xl font-bold">{value.toLocaleString('ru-RU')}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MoneyCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={accent ? 'border-primary/40 bg-primary/[0.03]' : undefined}>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold">{value.toLocaleString('ru-RU')} <span className="text-base font-medium text-muted-foreground">BYN</span></div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}

export default FinanceDashboard;
