import { useCallback, useEffect, useState } from 'react';
import {
  Gift, Search, Plus, Trash2, Loader2, MousePointerClick, Users, Crown, Coins, Copy, Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminReferralApi, type AdminReferralCode } from '@/lib/api/client';

const PAGE = 30;

export function ReferralManager({ token }: { token: string | null }) {
  const [items, setItems] = useState<AdminReferralCode[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ clicks: 0, signups: 0, conversions: 0, revenue: 0 });
  const [facets, setFacets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [active, setActive] = useState('all');
  const [sort, setSort] = useState('new');

  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDiscount, setNewDiscount] = useState(15);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<AdminReferralCode | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback((reset: boolean) => {
    if (!token) return;
    const off = reset ? 0 : offset;
    setLoading(true);
    void adminReferralApi.list({
      q: q || undefined,
      type: type === 'all' ? undefined : type,
      active: active === 'all' ? undefined : active,
      sort,
      limit: PAGE,
      offset: off,
    }, token).then((r) => {
      if (r.data) {
        setItems(reset ? r.data.items : (prev) => [...prev, ...r.data!.items]);
        setTotal(r.data.total);
        setTotals(r.data.totals);
        setFacets(r.data.facets.type);
        setOffset(off + PAGE);
      }
    }).finally(() => setLoading(false));
  }, [token, q, type, active, sort, offset]);

  // Перезагрузка с нуля при смене фильтров (с дебаунсом поиска).
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); load(true); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, active, sort, token]);

  const create = async () => {
    if (!token) return;
    setCreating(true);
    setCreateErr(null);
    const res = await adminReferralApi.create({
      code: newCode.trim() || undefined,
      label: newLabel.trim() || undefined,
      type: 'BLOGGER',
      discountPct: newDiscount,
    }, token);
    setCreating(false);
    if (res.data) {
      setNewCode(''); setNewLabel(''); setNewDiscount(15); setShowCreate(false);
      setOffset(0); load(true);
    } else {
      setCreateErr(res.error || 'Не удалось создать код');
    }
  };

  const toggleActive = async (c: AdminReferralCode) => {
    if (!token) return;
    setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !x.active } : x));
    await adminReferralApi.update(c.id, { active: !c.active }, token);
  };

  const updateDiscount = async (c: AdminReferralCode, value: number) => {
    if (!token || value === c.discountPct) return;
    setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, discountPct: value } : x));
    await adminReferralApi.update(c.id, { discountPct: value }, token);
  };

  const doDelete = async () => {
    if (!token || !deleting) return;
    const id = deleting.id;
    setDeleting(null);
    setItems((prev) => prev.filter((x) => x.id !== id));
    await adminReferralApi.remove(id, token);
    load(true);
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); } catch { /* */ }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-primary" />Реферальные коды</h2>
        <p className="text-sm text-muted-foreground">Личные коды пользователей и партнёрские коды блогеров · всего {total}</p>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Summary icon={MousePointerClick} className="text-blue-500" label="Переходы" value={totals.clicks} />
        <Summary icon={Users} className="text-violet-500" label="Регистрации" value={totals.signups} />
        <Summary icon={Crown} className="text-amber-500" label="Оплаты" value={totals.conversions} />
        <Summary icon={Coins} className="text-green-500" label="Выручка, BYN" value={Math.round(totals.revenue)} />
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Код, метка, email владельца…" className="pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы {facets.USER || facets.BLOGGER ? `(${(facets.USER ?? 0) + (facets.BLOGGER ?? 0)})` : ''}</SelectItem>
            <SelectItem value="USER">Пользователи {facets.USER ? `(${facets.USER})` : ''}</SelectItem>
            <SelectItem value="BLOGGER">Блогеры {facets.BLOGGER ? `(${facets.BLOGGER})` : ''}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="true">Активные</SelectItem>
            <SelectItem value="false">Выключенные</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Сначала новые</SelectItem>
            <SelectItem value="signups">По регистрациям</SelectItem>
            <SelectItem value="conversions">По оплатам</SelectItem>
            <SelectItem value="revenue">По выручке</SelectItem>
            <SelectItem value="clicks">По переходам</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate((s) => !s)} className="shrink-0 gap-1.5"><Plus className="w-4 h-4" />Код блогера</Button>
      </div>

      {/* Создание кода блогера */}
      {showCreate && (
        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Код (необязательно)</label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="Сгенерируем сами" className="uppercase" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Метка / блогер</label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Имя или кампания" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Скидка, %</label>
              <Input type="number" min={0} max={100} value={newDiscount} onChange={(e) => setNewDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))} />
            </div>
            <Button onClick={create} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Создать
            </Button>
            {createErr && <p className="text-sm text-red-500 sm:col-span-4">{createErr}</p>}
          </CardContent>
        </Card>
      )}

      {/* Таблица */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Код</th>
                <th className="px-3 py-2.5 font-medium">Тип / владелец</th>
                <th className="px-3 py-2.5 font-medium text-center">Скидка</th>
                <th className="px-3 py-2.5 font-medium text-center" title="Переходы"><MousePointerClick className="w-4 h-4 inline" /></th>
                <th className="px-3 py-2.5 font-medium text-center" title="Регистрации"><Users className="w-4 h-4 inline" /></th>
                <th className="px-3 py-2.5 font-medium text-center" title="Оплаты"><Crown className="w-4 h-4 inline" /></th>
                <th className="px-3 py-2.5 font-medium text-right">BYN</th>
                <th className="px-3 py-2.5 font-medium text-center">Активен</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <button onClick={() => copy(c.code)} className="font-mono font-semibold inline-flex items-center gap-1.5 hover:text-primary">
                      {c.code}
                      {copied === c.code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 opacity-40" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium mr-1.5 ${c.type === 'BLOGGER' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                      {c.type === 'BLOGGER' ? 'Блогер' : 'Юзер'}
                    </span>
                    <span className="text-muted-foreground text-xs">{c.label || c.owner?.email || c.owner?.name || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="number" min={0} max={100} defaultValue={c.discountPct}
                      onBlur={(e) => updateDiscount(c, Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-14 text-center rounded border border-border bg-background px-1 py-0.5"
                    />%
                  </td>
                  <td className="px-3 py-2.5 text-center">{c.clicks}</td>
                  <td className="px-3 py-2.5 text-center">{c.signups}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-amber-600 dark:text-amber-400">{c.conversions}</td>
                  <td className="px-3 py-2.5 text-right">{Math.round(c.revenue)}</td>
                  <td className="px-3 py-2.5 text-center"><Switch checked={c.active} onCheckedChange={() => toggleActive(c)} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Коды не найдены</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {items.length < total && (
        <div className="text-center">
          <Button variant="outline" onClick={() => load(false)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Показать ещё ({total - items.length})
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить код «{deleting?.code}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Код и связанная история приглашений будут удалены безвозвратно. Статистика по нему пропадёт.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Summary({ icon: Icon, className, label, value }: {
  icon: React.ComponentType<{ className?: string }>; className: string; label: string; value: number;
}) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Icon className={`w-4 h-4 ${className}`} />{label}</div>
      <div className="text-2xl font-bold">{value.toLocaleString('ru-RU')}</div>
    </CardContent></Card>
  );
}

export default ReferralManager;
