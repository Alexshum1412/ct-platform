/**
 * Ручная сборка пробных экзаменов администратором.
 *
 * Полный CRUD над сущностью Exam (таблица `exams`): админ выбирает предмет,
 * фильтрует задания по теме / подтеме / части / поиску, вручную отмечает
 * конкретные задания, задаёт порядок вопросов, название, время и проходной балл.
 * Сохранённый экзамен сразу появляется в списке экзаменов предмета
 * (страница /exam/:slug читает те же активные экзамены).
 *
 * Эндпоинты:
 *  - GET    /api/admin/exams?subjectId=…     список экзаменов предмета
 *  - POST   /api/admin/exams                 создать
 *  - PATCH  /api/admin/exams/:id             изменить
 *  - DELETE /api/admin/exams/:id             удалить
 *  - GET    /api/questions?subjectId&topicId&subtopicId&part&limit  пул заданий
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, ClipboardList, Search,
  ChevronUp, ChevronDown, Check, Eye, EyeOff, GripVertical, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';

type Exam = {
  id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingScore: number;
  questionIds: string[];
  isActive: boolean;
  order: number;
};

type QLite = {
  id: string;
  externalId?: string;
  content: string;
  part?: string;
  difficulty?: number;
  topicId?: string;
  subtopicId?: string;
  section?: string;
  type?: string;
};

type SubjectLite = { id: string; name: string; slug: string };
type TopicLite = { id: string; name: string };
type SubtopicLite = { id: string; name: string };

interface Form {
  id?: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  order: number;
  isActive: boolean;
}

const emptyForm: Form = { title: '', description: '', durationMinutes: 120, passingScore: 0, order: 0, isActive: true };
const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm';

export function ExamBuilder({ token }: { token: string | null }) {
  const addNotification = useAppStore((s) => s.addNotification);
  const notify = (type: 'success' | 'error', title: string, message?: string) => addNotification({ type, title, message });

  const [subjects, setSubjects] = useState<SubjectLite[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSel, setExamSel] = useState<Set<string>>(new Set());
  const [examBulkBusy, setExamBulkBusy] = useState(false);
  // Смена предмета сбрасывает выбор массовых операций.
  useEffect(() => { setExamSel(new Set()); }, [subjectId]);
  const [loadingExams, setLoadingExams] = useState(false);

  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [form, setForm] = useState<Form>(emptyForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Question picker state
  const [topics, setTopics] = useState<TopicLite[]>([]);
  const [subtopics, setSubtopics] = useState<SubtopicLite[]>([]);
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [partFilter, setPartFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pool, setPool] = useState<QLite[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  // Кэш всех виденных заданий по id — чтобы рисовать выбранные даже вне текущего фильтра
  const [qMap, setQMap] = useState<Record<string, QLite>>({});

  const authFetch = useCallback(async (path: string, method: string, body?: unknown) => {
    const r = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data as { error?: string }).error || 'Ошибка запроса');
    return data;
  }, [token]);

  const mergeIntoMap = useCallback((qs: QLite[]) => {
    setQMap((prev) => {
      const next = { ...prev };
      for (const q of qs) next[q.id] = q;
      return next;
    });
  }, []);

  // Subjects (once)
  useEffect(() => {
    void fetch(`${API_BASE_URL}/subjects`).then((r) => r.json()).then((d) => {
      const arr = ((d.subjects || d || []) as SubjectLite[]).map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
      setSubjects(arr);
      setSubjectId((prev) => prev || (arr[0]?.id ?? ''));
    }).catch(() => {});
  }, []);

  // Topics of subject
  useEffect(() => {
    if (!subjectId) { setTopics([]); return; }
    void fetch(`${API_BASE_URL}/subjects/${subjectId}/topics`).then((r) => r.json())
      .then((d) => setTopics(((d || []) as TopicLite[]).map((t) => ({ id: t.id, name: t.name }))))
      .catch(() => setTopics([]));
  }, [subjectId]);

  // Subtopics of topic
  useEffect(() => {
    if (!topicId) { setSubtopics([]); setSubtopicId(''); return; }
    void fetch(`${API_BASE_URL}/topics/${topicId}/subtopics`).then((r) => r.json())
      .then((d) => setSubtopics(((d || []) as SubtopicLite[]).map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setSubtopics([]));
    setSubtopicId('');
  }, [topicId]);

  const loadExams = useCallback(async () => {
    if (!subjectId) { setExams([]); return; }
    setLoadingExams(true);
    try {
      const d = await authFetch(`/admin/exams?subjectId=${subjectId}`, 'GET');
      setExams((Array.isArray(d) ? d : []) as Exam[]);
    } catch { setExams([]); } finally { setLoadingExams(false); }
  }, [subjectId, authFetch]);

  useEffect(() => { if (mode === 'list') void loadExams(); }, [loadExams, mode]);

  // Пул заданий для выбора (в режиме редактирования)
  useEffect(() => {
    if (mode !== 'edit' || !subjectId) return;
    setLoadingPool(true);
    const params = new URLSearchParams({ subjectId, limit: '500' });
    if (topicId) params.set('topicId', topicId);
    if (subtopicId) params.set('subtopicId', subtopicId);
    if (partFilter !== 'all') params.set('part', partFilter);
    void fetch(`${API_BASE_URL}/questions?${params.toString()}`).then((r) => r.json())
      .then((d) => {
        const qs = ((d.questions || []) as Array<Record<string, unknown>>).map((q): QLite => ({
          id: String(q.id),
          externalId: q.externalId ? String(q.externalId) : undefined,
          content: String(q.content ?? ''),
          part: q.part ? String(q.part) : undefined,
          difficulty: typeof q.difficulty === 'number' ? q.difficulty : undefined,
          topicId: q.topicId ? String(q.topicId) : undefined,
          subtopicId: q.subtopicId ? String(q.subtopicId) : undefined,
          section: q.section ? String(q.section) : undefined,
          type: q.type ? String(q.type) : undefined,
        }));
        setPool(qs);
        mergeIntoMap(qs);
      })
      .catch(() => setPool([]))
      .finally(() => setLoadingPool(false));
  }, [mode, subjectId, topicId, subtopicId, partFilter, mergeIntoMap]);

  const openCreate = () => {
    setForm({ ...emptyForm, order: exams.length });
    setSelectedIds([]);
    setTopicId(''); setSubtopicId(''); setPartFilter('all'); setSearch('');
    setMode('edit');
  };

  const openEdit = async (exam: Exam) => {
    setForm({
      id: exam.id, title: exam.title, description: exam.description ?? '',
      durationMinutes: exam.durationMinutes, passingScore: exam.passingScore,
      order: exam.order ?? 0, isActive: exam.isActive,
    });
    setSelectedIds(exam.questionIds ?? []);
    setTopicId(''); setSubtopicId(''); setPartFilter('all'); setSearch('');
    setMode('edit');
    // Подгрузим объекты выбранных заданий, чтобы показать их содержимое
    try {
      const d = await fetch(`${API_BASE_URL}/questions?subjectId=${exam.subjectId}&limit=1000`).then((r) => r.json());
      const qs = ((d.questions || []) as Array<Record<string, unknown>>).map((q): QLite => ({
        id: String(q.id), externalId: q.externalId ? String(q.externalId) : undefined,
        content: String(q.content ?? ''), part: q.part ? String(q.part) : undefined,
        difficulty: typeof q.difficulty === 'number' ? q.difficulty : undefined,
        topicId: q.topicId ? String(q.topicId) : undefined,
        subtopicId: q.subtopicId ? String(q.subtopicId) : undefined,
        section: q.section ? String(q.section) : undefined, type: q.type ? String(q.type) : undefined,
      }));
      mergeIntoMap(qs);
    } catch { /* ignore */ }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const removeSelected = (id: string) => setSelectedIds((prev) => prev.filter((x) => x !== id));
  const move = (index: number, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (!form.title.trim()) { notify('error', 'Укажите название экзамена'); return; }
    if (selectedIds.length === 0) { notify('error', 'Добавьте хотя бы одно задание'); return; }
    setBusy(true);
    try {
      const body = {
        subjectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        durationMinutes: Number(form.durationMinutes) || 120,
        passingScore: Number(form.passingScore) || 0,
        order: Number(form.order) || 0,
        isActive: form.isActive,
        questionIds: selectedIds,
      };
      if (form.id) await authFetch(`/admin/exams/${form.id}`, 'PATCH', body);
      else await authFetch('/admin/exams', 'POST', body);
      notify('success', form.id ? 'Экзамен обновлён' : 'Экзамен создан', `${selectedIds.length} заданий`);
      setMode('list');
      await loadExams();
    } catch (e) {
      notify('error', 'Не удалось сохранить', e instanceof Error ? e.message : undefined);
    } finally { setBusy(false); }
  };

  const remove = async (exam: Exam) => {
    if (!window.confirm(`Удалить экзамен «${exam.title}»? Действие необратимо.`)) return;
    try {
      await authFetch(`/admin/exams/${exam.id}`, 'DELETE');
      notify('success', 'Экзамен удалён');
      await loadExams();
    } catch (e) {
      notify('error', 'Не удалось удалить', e instanceof Error ? e.message : undefined);
    }
  };

  const toggleActive = async (exam: Exam) => {
    try {
      await authFetch(`/admin/exams/${exam.id}`, 'PATCH', { isActive: !exam.isActive });
      setExams((prev) => prev.map((e) => e.id === exam.id ? { ...e, isActive: !e.isActive } : e));
    } catch (e) {
      notify('error', 'Не удалось изменить статус', e instanceof Error ? e.message : undefined);
    }
  };

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';

  // Массовые операции над сохранёнными экзаменами (list view)
  const toggleExamSel = (id: string) => {
    setExamSel(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allExamsSelected = exams.length > 0 && exams.every(e => examSel.has(e.id));
  const toggleAllExams = () => {
    setExamSel(prev => {
      const next = new Set(prev);
      if (allExamsSelected) exams.forEach(e => next.delete(e.id));
      else exams.forEach(e => next.add(e.id));
      return next;
    });
  };
  const runExamsBulk = async (op: 'delete' | 'update', data?: Record<string, unknown>) => {
    if (examSel.size === 0 || examBulkBusy) return;
    if (op === 'delete' && !window.confirm(`Удалить выбранные экзамены (${examSel.size})? Действие необратимо.`)) return;
    setExamBulkBusy(true);
    try {
      const res = await authFetch('/admin/exams/bulk', 'POST', { ids: Array.from(examSel), op, data }) as { count?: number };
      notify('success', op === 'delete' ? `Удалено экзаменов: ${res.count ?? 0}` : `Изменено экзаменов: ${res.count ?? 0}`);
      setExamSel(new Set());
      await loadExams();
    } catch (e) {
      notify('error', 'Ошибка массовой операции', e instanceof Error ? e.message : undefined);
    } finally { setExamBulkBusy(false); }
  };

  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((x) => x.content.toLowerCase().includes(q) || (x.externalId ?? '').toLowerCase().includes(q));
  }, [pool, search]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // ====================== LIST VIEW ======================
  if (mode === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button onClick={openCreate} className="gap-1.5" disabled={!subjectId}>
            <Plus className="w-4 h-4" />Собрать экзамен
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">
            Экзамены показываются на странице «Пробные экзамены» предмета сразу после сохранения.
          </p>
        </div>

        {/* Панель массовых операций */}
        {examSel.size > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{examSel.size} выбрано</span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={examBulkBusy} onClick={() => void runExamsBulk('update', { isActive: false })}>Скрыть</Button>
              <Button size="sm" variant="outline" disabled={examBulkBusy} onClick={() => void runExamsBulk('update', { isActive: true })}>Показать</Button>
              <Button size="sm" variant="destructive" disabled={examBulkBusy} onClick={() => void runExamsBulk('delete')}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />Удалить
              </Button>
              <Button size="sm" variant="ghost" disabled={examBulkBusy} onClick={() => setExamSel(new Set())}>Отмена</Button>
            </div>
          </div>
        )}

        {loadingExams ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />Загрузка…
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            По предмету «{subjectName}» ещё нет экзаменов. Нажмите «Собрать экзамен».
          </div>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border">
            <label className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground cursor-pointer select-none bg-muted/30">
              <input type="checkbox" checked={allExamsSelected} onChange={toggleAllExams} className="w-4 h-4 rounded border-input accent-primary" />
              Выбрать все ({exams.length})
            </label>
            {exams.map((exam) => (
              <div key={exam.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 ${examSel.has(exam.id) ? 'bg-primary/5' : ''}`}>
                <input
                  type="checkbox"
                  checked={examSel.has(exam.id)}
                  onChange={() => toggleExamSel(exam.id)}
                  className="w-4 h-4 shrink-0 rounded border-input accent-primary"
                  aria-label="Выбрать экзамен"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{exam.title}</p>
                    {!exam.isActive && <Badge variant="outline" className="text-xs">Скрыт</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {exam.questionIds.length} заданий · {exam.durationMinutes} мин
                    {exam.passingScore > 0 && ` · проходной ${exam.passingScore}`}
                  </p>
                </div>
                <button onClick={() => toggleActive(exam)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title={exam.isActive ? 'Скрыть с сайта' : 'Показать на сайте'}>
                  {exam.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => void openEdit(exam)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title="Редактировать"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(exam)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Удалить"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ====================== EDIT / BUILD VIEW ======================
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{form.id ? 'Редактирование экзамена' : 'Новый экзамен'}</h3>
          <Badge variant="secondary" className="text-xs">{subjectName}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setMode('list')} disabled={busy}>Отмена</Button>
          <Button onClick={save} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Сохранить экзамен
          </Button>
        </div>
      </div>

      {/* Meta fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="text-sm font-medium mb-1.5 block">Название экзамена <span className="text-destructive">*</span></span>
          <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Напр.: Пробный ЦТ — вариант 1" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium mb-1.5 block">Описание</span>
          <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Короткое описание (необязательно)" />
        </label>
        <label className="block">
          <span className="text-sm font-medium mb-1.5 block">Время (мин)</span>
          <input type="number" min={1} className={inputCls} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium mb-1.5 block">Проходной балл</span>
          <input type="number" min={0} className={inputCls} value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium mb-1.5 block">Порядок в списке</span>
          <input type="number" className={inputCls} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 mt-7">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
          <span className="text-sm">Показывать на сайте</span>
        </label>
      </div>

      {/* Two-pane question picker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available */}
        <div className="border border-border rounded-xl flex flex-col min-h-[420px]">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="w-4 h-4" />Доступные задания</div>
            <div className="grid grid-cols-2 gap-2">
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs">
                <option value="">Все темы</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)} disabled={!topicId} className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs disabled:opacity-50">
                <option value="">Все подтемы</option>
                {subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={partFilter} onChange={(e) => setPartFilter(e.target.value)} className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs">
                <option value="all">Часть A и B</option>
                <option value="A">Часть A</option>
                <option value="B">Часть B</option>
              </select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…" className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-border bg-background text-xs" />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-border">
            {loadingPool ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center text-sm"><Loader2 className="w-4 h-4 animate-spin" />Загрузка…</div>
            ) : filteredPool.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Заданий не найдено под фильтры.</div>
            ) : (
              filteredPool.map((q) => {
                const sel = selectedSet.has(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggleSelect(q.id)}
                    className={`w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-muted/50 transition-colors ${sel ? 'bg-primary/5' : ''}`}
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-primary border-primary text-white' : 'border-border'}`}>
                      {sel ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {q.externalId && <Badge variant="outline" className="text-[10px] px-1 py-0">#{q.externalId}</Badge>}
                        {q.part && <Badge variant="secondary" className="text-[10px] px-1 py-0">Часть {q.part}</Badge>}
                        {q.type === 'TEXT_INPUT' && <Badge variant="secondary" className="text-[10px] px-1 py-0">Открытый</Badge>}
                      </span>
                      <span className="block text-xs text-muted-foreground line-clamp-2">{q.content.slice(0, 160)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected */}
        <div className="border border-border rounded-xl flex flex-col min-h-[420px]">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GripVertical className="w-4 h-4" />В экзамене
              <Badge className="text-xs">{selectedIds.length}</Badge>
            </div>
            {selectedIds.length > 0 && (
              <button onClick={() => setSelectedIds([])} className="text-xs text-destructive hover:underline">Очистить</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-border">
            {selectedIds.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm px-4">
                Отметьте задания слева — они появятся здесь. Порядок можно менять стрелками.
              </div>
            ) : (
              selectedIds.map((id, i) => {
                const q = qMap[id];
                return (
                  <div key={id} className="flex items-start gap-2 px-3 py-2">
                    <span className="mt-0.5 text-xs font-semibold text-muted-foreground w-6 shrink-0">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {q?.externalId && <Badge variant="outline" className="text-[10px] px-1 py-0">#{q.externalId}</Badge>}
                        {q?.part && <Badge variant="secondary" className="text-[10px] px-1 py-0">Часть {q.part}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{q ? q.content.slice(0, 160) : `Задание ${id}`}</p>
                    </div>
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Выше"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => move(i, 1)} disabled={i === selectedIds.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Ниже"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => removeSelected(id)} className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0" title="Убрать"><X className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamBuilder;
