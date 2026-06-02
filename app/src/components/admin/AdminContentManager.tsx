/**
 * Real content-management CRUD for the admin panel: subjects, topics, subtopics,
 * theory and exams. Uses the dynamic API routes — changes reflect on the site
 * immediately. No stubs: every action hits a working backend endpoint.
 */
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api/client';
import { useAppStore } from '@/store/useAppStore';

// Экзамены вынесены в отдельную вкладку «Экзамены» (ExamBuilder) с ручной сборкой.
type Entity = 'subjects' | 'topics' | 'subtopics' | 'theory';
type Row = { id: string; [k: string]: unknown };
type FormState = Record<string, unknown> & { id?: string };

const ENTITY_LABEL: Record<Entity, string> = {
  subjects: 'Предметы', topics: 'Темы', subtopics: 'Под-темы', theory: 'Теория',
};

export function AdminContentManager({ token }: { token: string | null }) {
  const addNotification = useAppStore((s) => s.addNotification);

  const [entity, setEntity] = useState<Entity>('subjects');
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState<Row[]>([]);
  const [topicId, setTopicId] = useState('');
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  const apiCall = useCallback(async (path: string, method: string, body?: unknown) => {
    const r = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data as { error?: string }).error || 'Ошибка запроса');
    return data;
  }, [token]);

  // Subjects (load once)
  useEffect(() => {
    void fetch(`${API_BASE_URL}/subjects`).then((r) => r.json()).then((d) => {
      const arr = (d.subjects || d || []) as Row[];
      setSubjects(arr);
      setSubjectId((prev) => prev || (arr[0] ? String(arr[0].id) : ''));
    }).catch(() => {});
  }, []);

  // Topics of selected subject
  useEffect(() => {
    if (!subjectId) { setTopics([]); return; }
    void fetch(`${API_BASE_URL}/subjects/${subjectId}/topics`).then((r) => r.json())
      .then((d) => setTopics((d || []) as Row[])).catch(() => setTopics([]));
  }, [subjectId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (entity === 'subjects') {
        const d = await fetch(`${API_BASE_URL}/subjects`).then((r) => r.json());
        setItems((d.subjects || d || []) as Row[]);
      } else if (entity === 'topics') {
        const d = subjectId ? await fetch(`${API_BASE_URL}/subjects/${subjectId}/topics`).then((r) => r.json()) : [];
        setItems((d || []) as Row[]);
      } else if (entity === 'subtopics') {
        const d = topicId ? await fetch(`${API_BASE_URL}/topics/${topicId}/subtopics`).then((r) => r.json()) : [];
        setItems((d || []) as Row[]);
      } else if (entity === 'theory') {
        const q = topicId ? `topicId=${topicId}` : `subjectId=${subjectId}`;
        const d = await fetch(`${API_BASE_URL}/theory?${q}&limit=500`).then((r) => r.json());
        setItems((d.items || []) as Row[]);
      }
    } catch { setItems([]); } finally { setLoading(false); }
  }, [entity, subjectId, topicId]);

  useEffect(() => { void reload(); }, [reload]);

  const notify = (type: 'success' | 'error', title: string, message?: string) => addNotification({ type, title, message });

  const openCreate = () => {
    const base: Record<Entity, FormState> = {
      subjects: { name: '', slug: '', nameShort: '', description: '', color: 'hsl(217 91% 55%)', icon: 'BookOpen', order: 0, isActive: true },
      topics: { name: '', description: '', order: 0 },
      subtopics: { name: '', description: '', order: 0 },
      theory: { title: '', content: '', summary: '', commonMistakes: '', examTraps: '', tags: '', order: 0, topicId, subtopicId: '' },
    };
    setForm(base[entity]);
  };

  const openEdit = (row: Row) => {
    if (entity === 'theory') {
      setForm({
        id: row.id, title: row.title, content: row.content, summary: row.summary ?? '',
        commonMistakes: Array.isArray(row.commonMistakes) ? (row.commonMistakes as string[]).join('\n') : '',
        examTraps: Array.isArray(row.examTraps) ? (row.examTraps as string[]).join('\n') : '',
        tags: Array.isArray(row.tags) ? (row.tags as string[]).join(', ') : '', order: row.order ?? 0,
        topicId: row.topicId ?? '', subtopicId: row.subtopicId ?? '',
      });
    } else {
      setForm({ ...row });
    }
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const isEdit = !!form.id;
      if (entity === 'subjects') {
        const body = { name: form.name, slug: form.slug, nameShort: form.nameShort, description: form.description, color: form.color, icon: form.icon, order: Number(form.order) || 0, isActive: form.isActive };
        if (isEdit) await apiCall(`/admin/subjects/${form.id}`, 'PATCH', body);
        else await apiCall('/admin/subjects', 'POST', body);
      } else if (entity === 'topics') {
        const body = { subjectId, name: form.name, description: form.description, order: Number(form.order) || 0 };
        if (isEdit) await apiCall(`/admin/topics/${form.id}`, 'PATCH', body);
        else await apiCall('/admin/topics', 'POST', body);
      } else if (entity === 'subtopics') {
        const body = { topicId, name: form.name, description: form.description, order: Number(form.order) || 0 };
        if (isEdit) await apiCall(`/admin/subtopics/${form.id}`, 'PATCH', body);
        else await apiCall('/admin/subtopics', 'POST', body);
      } else if (entity === 'theory') {
        const body = {
          subjectId, topicId: form.topicId || topicId || null, subtopicId: form.subtopicId || null,
          title: form.title, content: form.content, summary: form.summary || null,
          commonMistakes: String(form.commonMistakes || '').split('\n').map((s) => s.trim()).filter(Boolean),
          examTraps: String(form.examTraps || '').split('\n').map((s) => s.trim()).filter(Boolean),
          tags: String(form.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
          order: Number(form.order) || 0,
        };
        if (isEdit) await apiCall(`/admin/theory/${form.id}`, 'PATCH', body);
        else await apiCall('/admin/theory', 'POST', body);
      }
      notify('success', form.id ? 'Сохранено' : 'Создано');
      setForm(null);
      await reload();
    } catch (e) {
      notify('error', 'Не удалось сохранить', e instanceof Error ? e.message : undefined);
    } finally { setBusy(false); }
  };

  const remove = async (row: Row) => {
    if (!window.confirm('Удалить этот элемент? Действие необратимо.')) return;
    try {
      await apiCall(`/admin/${entity}/${row.id}`, 'DELETE');
      notify('success', 'Удалено');
      await reload();
    } catch (e) {
      notify('error', 'Не удалось удалить', e instanceof Error ? e.message : undefined);
    }
  };

  const title = (r: Row) => String(r.title || r.name || r.id);
  const filtered = items.filter((r) => !search || title(r).toLowerCase().includes(search.toLowerCase()));
  const needsSubject = entity !== 'subjects';
  const needsTopic = entity === 'subtopics' || entity === 'theory';

  return (
    <div className="space-y-4">
      {/* Entity tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <FolderTree className="w-5 h-5 text-muted-foreground" />
        {(Object.keys(ENTITY_LABEL) as Entity[]).map((e) => (
          <button
            key={e}
            onClick={() => { setEntity(e); setForm(null); setSearch(''); }}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${entity === e ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/70'}`}
          >
            {ENTITY_LABEL[e]}
          </button>
        ))}
      </div>

      {/* Context selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        {needsSubject && (
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }} className="px-3 py-2 rounded-lg border border-border bg-background text-sm">
            {subjects.map((s) => <option key={s.id} value={String(s.id)}>{String(s.name)}</option>)}
          </select>
        )}
        {needsTopic && (
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-sm">
            <option value="">{entity === 'theory' ? 'Все темы предмета' : '— выберите тему —'}</option>
            {topics.map((t) => <option key={t.id} value={String(t.id)}>{String(t.name)}</option>)}
          </select>
        )}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…" className="px-3 py-2 rounded-lg border border-border bg-background text-sm flex-1 min-w-[140px]" />
        <Button onClick={openCreate} className="gap-1.5" disabled={needsTopic && entity === 'subtopics' && !topicId}>
          <Plus className="w-4 h-4" />Создать
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" />Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
          Ничего не найдено. {entity === 'subtopics' && !topicId ? 'Выберите тему.' : 'Нажмите «Создать».'}
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border max-h-[55vh] overflow-y-auto">
          {filtered.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{title(row)}</p>
                {(entity === 'theory') && row.subtopicName ? <p className="text-xs text-muted-foreground truncate">{String(row.topicName || '')}{row.subtopicName ? ` › ${row.subtopicName}` : ''}</p> : null}
              </div>
              <button onClick={() => openEdit(row)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title="Редактировать"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(row)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit form */}
      {form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !busy && setForm(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-lg">{form.id ? 'Редактирование' : 'Создание'} · {ENTITY_LABEL[entity]}</h3>
              <button onClick={() => setForm(null)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {entity === 'subjects' && (<>
                <Field label="Название"><input className={inputCls} value={String(form.name ?? '')} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Slug (латиницей, уникальный)"><input className={inputCls} value={String(form.slug ?? '')} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!form.id} /></Field>
                <Field label="Короткое имя"><input className={inputCls} value={String(form.nameShort ?? '')} onChange={(e) => setForm({ ...form, nameShort: e.target.value })} /></Field>
                <Field label="Описание"><input className={inputCls} value={String(form.description ?? '')} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <Field label="Цвет (HSL)"><input className={inputCls} value={String(form.color ?? '')} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
                <Field label="Порядок"><input type="number" className={inputCls} value={Number(form.order ?? 0)} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
              </>)}
              {(entity === 'topics' || entity === 'subtopics') && (<>
                <Field label="Название"><input className={inputCls} value={String(form.name ?? '')} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Описание"><input className={inputCls} value={String(form.description ?? '')} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <Field label="Порядок"><input type="number" className={inputCls} value={Number(form.order ?? 0)} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
              </>)}
              {entity === 'theory' && (<>
                <Field label="Заголовок"><input className={inputCls} value={String(form.title ?? '')} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
                <Field label="Тема"><select className={inputCls} value={String(form.topicId ?? '')} onChange={(e) => setForm({ ...form, topicId: e.target.value })}><option value="">— без темы —</option>{topics.map((t) => <option key={t.id} value={String(t.id)}>{String(t.name)}</option>)}</select></Field>
                <Field label="Содержание (поддерживает $формулы$)"><textarea className={`${inputCls} min-h-[160px]`} value={String(form.content ?? '')} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
                <Field label="Кратко (вывод)"><textarea className={`${inputCls} min-h-[60px]`} value={String(form.summary ?? '')} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
                <Field label="Типичные ошибки (по одной в строке)"><textarea className={`${inputCls} min-h-[70px]`} value={String(form.commonMistakes ?? '')} onChange={(e) => setForm({ ...form, commonMistakes: e.target.value })} /></Field>
                <Field label="Ловушки на экзамене (по одной в строке)"><textarea className={`${inputCls} min-h-[70px]`} value={String(form.examTraps ?? '')} onChange={(e) => setForm({ ...form, examTraps: e.target.value })} /></Field>
                <Field label="Теги (через запятую)"><input className={inputCls} value={String(form.tags ?? '')} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
              </>)}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
              <Button variant="outline" onClick={() => setForm(null)} disabled={busy}>Отмена</Button>
              <Button onClick={save} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export default AdminContentManager;
