/**
 * Журнал действий администратора: кто, когда, что изменил.
 * Поиск, фильтры по сущности/действию/автору/датам, пагинация,
 * раскрытие старого/нового значения, экспорт в CSV.
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, History, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuditApi, type AuditLogRow } from '@/lib/api/client';

const PAGE_SIZE = 30;

const ACTION_META: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'Создание', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  UPDATE: { label: 'Изменение', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  DELETE: { label: 'Удаление', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  BULK_UPDATE: { label: 'Массовое изменение', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  BULK_DELETE: { label: 'Массовое удаление', cls: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-400' },
  APPROVE: { label: 'Одобрение', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  REJECT: { label: 'Отклонение', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
};

const ENTITY_LABELS: Record<string, string> = {
  subject: 'Предмет',
  topic: 'Тема',
  subtopic: 'Подтема',
  theory: 'Теория',
  exam: 'Экзамен',
  question: 'Задание',
  olympiadProblem: 'Олимп. задача',
  olympiadTheory: 'Теория PRO',
  contactMessage: 'Сообщение',
  report: 'Жалоба',
};

const prettyJson = (raw: string | null): string => {
  if (!raw) return '—';
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export function AuditLogViewer({ token: tokenProp }: { token: string | null }) {
  const token = tokenProp ?? '';
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<{ entities: string[]; actions: string[] }>({ entities: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);

  const filtersActive = !!(q || entity || action || actor || from || to);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminAuditApi.list({ q, entity, action, actor, from, to, limit: PAGE_SIZE, offset }, token);
    if (r.data) {
      setLogs(r.data.logs);
      setTotal(r.data.total);
      setFacets(r.data.facets);
    }
    setLoading(false);
  }, [q, entity, action, actor, from, to, offset, token]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, q || actor ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q, actor]);

  const resetFilters = () => {
    setQ(''); setEntity(''); setAction(''); setActor(''); setFrom(''); setTo(''); setOffset(0);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(adminAuditApi.exportCsvUrl({ q, entity, action, actor, from, to }), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="relative lg:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => { setQ(e.target.value); setOffset(0); }} placeholder="Поиск по описанию или ID…" className="pl-9 h-10" />
        </div>
        <select value={entity} onChange={e => { setEntity(e.target.value); setOffset(0); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Все сущности</option>
          {facets.entities.map(en => <option key={en} value={en}>{ENTITY_LABELS[en] ?? en}</option>)}
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); setOffset(0); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Все действия</option>
          {facets.actions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>)}
        </select>
        <Input value={actor} onChange={e => { setActor(e.target.value); setOffset(0); }} placeholder="Email администратора…" className="h-10" />
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setOffset(0); }} className="h-10" aria-label="С даты" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setOffset(0); }} className="h-10" aria-label="По дату" />
        </div>
        <div className="flex items-center gap-2">
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting || total === 0} className="gap-1.5 ml-auto">
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Экспорт…' : 'CSV'}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {loading ? 'Загрузка…' : `Записей: ${total}`}
      </p>

      {/* Список */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          {filtersActive ? 'По выбранным фильтрам записей нет.' : 'Журнал пока пуст — действия администраторов появятся здесь.'}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const meta = ACTION_META[log.action] ?? { label: log.action, cls: 'bg-muted text-foreground' };
            const isOpen = expanded === log.id;
            const hasDetails = !!(log.oldValue || log.newValue);
            return (
              <div key={log.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => hasDetails && setExpanded(isOpen ? null : log.id)}
                  className={`w-full text-left p-3 md:px-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 ${hasDetails ? 'hover:bg-muted/40 transition-colors' : 'cursor-default'}`}
                >
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{fmtDate(log.createdAt)}</span>
                  <Badge className={`text-xs ${meta.cls}`}>{meta.label}</Badge>
                  <Badge variant="outline" className="text-xs">{ENTITY_LABELS[log.entity] ?? log.entity}</Badge>
                  <span className="text-sm font-medium min-w-0 flex-1 truncate">{log.summary ?? log.entityId ?? '—'}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">{log.actorEmail ?? 'система'}</span>
                  {hasDetails && <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                </button>
                {isOpen && (
                  <div className="border-t bg-muted/20 p-3 md:p-4 grid md:grid-cols-2 gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold mb-1.5 text-muted-foreground">Было</p>
                      <pre className="rounded-lg border bg-background p-2.5 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">{prettyJson(log.oldValue)}</pre>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold mb-1.5 text-muted-foreground">Стало</p>
                      <pre className="rounded-lg border bg-background p-2.5 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">{prettyJson(log.newValue)}</pre>
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      {log.entityId && <span>ID: <span className="font-mono">{log.entityId}</span></span>}
                      {log.ip && <span>IP: {log.ip}</span>}
                      {log.userAgent && <span className="truncate max-w-full">UA: {log.userAgent}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Пагинация */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Назад
          </Button>
          <span className="text-sm text-muted-foreground">Стр. {page} из {pages}</span>
          <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="gap-1">
            Вперёд <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
