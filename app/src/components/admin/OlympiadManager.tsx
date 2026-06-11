/**
 * Админ-менеджер раздела «Олимпиадная подготовка»: CRUD задач и теории
 * повышенного уровня. Поиск, фильтры, пагинация, модальное подтверждение
 * удаления, мгновенное обновление списка без перезагрузки.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminOlympiadApi, subjectsApi, type OlympiadLevel } from '@/lib/api/client';
import { LEVEL_META, LEVEL_ORDER } from '@/components/olympiad/levels';

interface SubjectOption { id: string; slug: string; name: string }

interface ProblemRow {
  id: string; title: string; subjectId: string; level: OlympiadLevel; difficulty: number;
  topic: string | null; year: number | null; points: number; status?: string;
  content: string; answer: string; solution: string; hints: string[]; tags: string[];
  grade?: string | null;
  subject?: { id: string; slug: string; name: string };
}
interface TheoryRow {
  id: string; title: string; subjectId: string; level: OlympiadLevel; topic: string | null;
  order: number; content: string; tags: string[]; status?: string;
  subject?: { id: string; slug: string; name: string };
}

const emptyProblem = {
  id: '', subjectId: '', title: '', level: 'SCHOOL' as OlympiadLevel, topic: '', year: '',
  difficulty: 3, points: '', grade: '9–11', content: '', answer: '', solution: '', hints: '', tags: '',
};
const emptyTheory = {
  id: '', subjectId: '', title: '', level: 'REGION' as OlympiadLevel, topic: '', order: 0, content: '', tags: '',
};

export function OlympiadManager({ token: tokenProp }: { token: string | null }) {
  const token = tokenProp ?? '';
  const [tab, setTab] = useState<'problems' | 'theory'>('problems');
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // Списки
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [theory, setTheory] = useState<TheoryRow[]>([]);
  const [q, setQ] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // Формы
  const [problemForm, setProblemForm] = useState(emptyProblem);
  const [theoryForm, setTheoryForm] = useState(emptyTheory);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'problems' | 'theory'; id: string; title: string } | null>(null);

  const PAGE = 20;

  useEffect(() => {
    subjectsApi.getAll().then(r => {
      const list = (r.data as { subjects?: SubjectOption[] } | SubjectOption[] | undefined);
      const arr = Array.isArray(list) ? list : list?.subjects ?? [];
      setSubjects(arr.map(s => ({ id: s.id, slug: s.slug, name: s.name })));
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === 'problems') {
      const r = await adminOlympiadApi.getProblems(
        { q: q || undefined, subjectId: subjectFilter || undefined, level: levelFilter || undefined, limit: PAGE, offset },
        token,
      );
      if (r.data) {
        setProblems(r.data.problems as unknown as ProblemRow[]);
        setTotal(r.data.total);
      }
    } else {
      const r = await adminOlympiadApi.getTheory({ q: q || undefined, subjectId: subjectFilter || undefined }, token);
      if (r.data) setTheory(r.data.articles as unknown as TheoryRow[]);
    }
    setLoading(false);
  }, [tab, q, subjectFilter, levelFilter, offset, token]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 2500); };

  // ---- Задачи ----
  const openCreateProblem = () => { setProblemForm({ ...emptyProblem, subjectId: subjects[0]?.id ?? '' }); setDialogOpen(true); };
  const openEditProblem = (p: ProblemRow) => {
    setProblemForm({
      id: p.id, subjectId: p.subjectId, title: p.title, level: p.level, topic: p.topic ?? '',
      year: p.year ? String(p.year) : '', difficulty: p.difficulty, points: String(p.points),
      grade: p.grade ?? '9–11', content: p.content, answer: p.answer, solution: p.solution,
      hints: (p.hints ?? []).join('\n'), tags: (p.tags ?? []).join(', '),
    });
    setDialogOpen(true);
  };
  const saveProblem = async () => {
    const f = problemForm;
    if (!f.subjectId || !f.title.trim() || !f.content.trim() || !f.answer.trim() || !f.solution.trim()) {
      flash('Заполните предмет, название, условие, ответ и разбор'); return;
    }
    setSaving(true);
    const body = {
      subjectId: f.subjectId, title: f.title.trim(), level: f.level, topic: f.topic.trim() || null,
      year: f.year ? Number(f.year) : null, difficulty: f.difficulty,
      points: f.points ? Number(f.points) : undefined, grade: f.grade || null,
      content: f.content, answer: f.answer.trim(), solution: f.solution,
      hints: f.hints.split('\n').map(h => h.trim()).filter(Boolean),
      tags: f.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    const r = f.id
      ? await adminOlympiadApi.updateProblem(f.id, body, token)
      : await adminOlympiadApi.createProblem(body, token);
    setSaving(false);
    if (r.error) { flash(`Ошибка: ${r.error}`); return; }
    setDialogOpen(false);
    flash(f.id ? 'Задача обновлена' : 'Задача создана');
    load();
  };

  // ---- Теория ----
  const openCreateTheory = () => { setTheoryForm({ ...emptyTheory, subjectId: subjects[0]?.id ?? '' }); setDialogOpen(true); };
  const openEditTheory = (t: TheoryRow) => {
    setTheoryForm({
      id: t.id, subjectId: t.subjectId, title: t.title, level: t.level, topic: t.topic ?? '',
      order: t.order, content: t.content, tags: (t.tags ?? []).join(', '),
    });
    setDialogOpen(true);
  };
  const saveTheory = async () => {
    const f = theoryForm;
    if (!f.subjectId || !f.title.trim() || !f.content.trim()) { flash('Заполните предмет, заголовок и текст'); return; }
    setSaving(true);
    const body = {
      subjectId: f.subjectId, title: f.title.trim(), level: f.level, topic: f.topic.trim() || null,
      order: f.order, content: f.content,
      tags: f.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    const r = f.id
      ? await adminOlympiadApi.updateTheory(f.id, body, token)
      : await adminOlympiadApi.createTheory(body, token);
    setSaving(false);
    if (r.error) { flash(`Ошибка: ${r.error}`); return; }
    setDialogOpen(false);
    flash(f.id ? 'Статья обновлена' : 'Статья создана');
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const r = deleteTarget.kind === 'problems'
      ? await adminOlympiadApi.deleteProblem(deleteTarget.id, token)
      : await adminOlympiadApi.deleteTheory(deleteTarget.id, token);
    if (r.error) flash(`Ошибка: ${r.error}`);
    else { flash('Удалено'); load(); }
    setDeleteTarget(null);
  };

  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      {/* Подвкладки */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={tab === 'problems' ? 'secondary' : 'outline'} onClick={() => { setTab('problems'); setOffset(0); }}>Задачи</Button>
        <Button size="sm" variant={tab === 'theory' ? 'secondary' : 'outline'} onClick={() => { setTab('theory'); setOffset(0); }}>Теория PRO</Button>
        <Button size="sm" className="ml-auto" onClick={tab === 'problems' ? openCreateProblem : openCreateTheory}>
          <Plus className="w-4 h-4 mr-1" />{tab === 'problems' ? 'Новая задача' : 'Новая статья'}
        </Button>
      </div>

      {/* Фильтры */}
      <div className="grid sm:grid-cols-3 gap-2">
        <Input value={q} onChange={e => { setQ(e.target.value); setOffset(0); }} placeholder="Поиск…" className="h-10" />
        <select value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setOffset(0); }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Все предметы</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {tab === 'problems' && (
          <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setOffset(0); }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Все этапы</option>
            {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_META[l].label}</option>)}
          </select>
        )}
      </div>

      {notice && <p className="text-sm font-medium text-primary">{notice}</p>}

      {/* Список */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Загрузка…</p>
      ) : tab === 'problems' ? (
        <div className="space-y-2">
          {problems.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Задач не найдено</p>}
          {problems.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="outline">{LEVEL_META[p.level]?.short ?? p.level}</Badge>
                  <span>{p.subject?.name ?? subjectName(p.subjectId)}</span>
                  {p.topic && <span>· {p.topic}</span>}
                  {p.year && <span>· {p.year}</span>}
                  <span>· +{p.points}</span>
                </div>
                <p className="font-medium truncate mt-0.5">{p.title}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEditProblem(p)} aria-label="Редактировать"><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ kind: 'problems', id: p.id, title: p.title })} aria-label="Удалить"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {total > PAGE && (
            <div className="flex items-center justify-between pt-2 text-sm">
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Назад</Button>
              <span className="text-muted-foreground">{offset + 1}–{Math.min(offset + PAGE, total)} из {total}</span>
              <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Вперёд</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {theory.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Статей не найдено</p>}
          {theory.map(t => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="outline">{LEVEL_META[t.level]?.short ?? t.level}</Badge>
                  <span>{t.subject?.name ?? subjectName(t.subjectId)}</span>
                  {t.topic && <span>· {t.topic}</span>}
                </div>
                <p className="font-medium truncate mt-0.5">{t.title}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEditTheory(t)} aria-label="Редактировать"><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ kind: 'theory', id: t.id, title: t.title })} aria-label="Удалить"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* Диалог создания/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tab === 'problems'
                ? (problemForm.id ? 'Редактировать задачу' : 'Новая олимпиадная задача')
                : (theoryForm.id ? 'Редактировать статью' : 'Новая статья теории PRO')}
            </DialogTitle>
          </DialogHeader>

          {tab === 'problems' ? (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <select value={problemForm.subjectId} onChange={e => setProblemForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Предмет…</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={problemForm.level} onChange={e => setProblemForm(f => ({ ...f, level: e.target.value as OlympiadLevel }))}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_META[l].label}</option>)}
                </select>
              </div>
              <Input value={problemForm.title} onChange={e => setProblemForm(f => ({ ...f, title: e.target.value }))} placeholder="Название задачи" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input value={problemForm.topic} onChange={e => setProblemForm(f => ({ ...f, topic: e.target.value }))} placeholder="Тема" />
                <Input value={problemForm.year} onChange={e => setProblemForm(f => ({ ...f, year: e.target.value }))} placeholder="Год" inputMode="numeric" />
                <Input value={problemForm.points} onChange={e => setProblemForm(f => ({ ...f, points: e.target.value }))} placeholder="Очки (авто)" inputMode="numeric" />
                <select value={problemForm.difficulty} onChange={e => setProblemForm(f => ({ ...f, difficulty: Number(e.target.value) }))}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>Сложность {d}</option>)}
                </select>
              </div>
              <Textarea value={problemForm.content} onChange={e => setProblemForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Условие (формулы — в $...$, абзацы — пустой строкой)" rows={5} />
              <Input value={problemForm.answer} onChange={e => setProblemForm(f => ({ ...f, answer: e.target.value }))} placeholder="Ответ (короткая каноническая строка)" />
              <Textarea value={problemForm.solution} onChange={e => setProblemForm(f => ({ ...f, solution: e.target.value }))}
                placeholder="Пошаговый разбор" rows={6} />
              <Textarea value={problemForm.hints} onChange={e => setProblemForm(f => ({ ...f, hints: e.target.value }))}
                placeholder="Подсказки — по одной на строку" rows={2} />
              <Input value={problemForm.tags} onChange={e => setProblemForm(f => ({ ...f, tags: e.target.value }))} placeholder="Теги через запятую" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <select value={theoryForm.subjectId} onChange={e => setTheoryForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Предмет…</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={theoryForm.level} onChange={e => setTheoryForm(f => ({ ...f, level: e.target.value as OlympiadLevel }))}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_META[l].label}</option>)}
                </select>
              </div>
              <Input value={theoryForm.title} onChange={e => setTheoryForm(f => ({ ...f, title: e.target.value }))} placeholder="Заголовок статьи" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={theoryForm.topic} onChange={e => setTheoryForm(f => ({ ...f, topic: e.target.value }))} placeholder="Тема" />
                <Input value={String(theoryForm.order)} onChange={e => setTheoryForm(f => ({ ...f, order: Number(e.target.value) || 0 }))} placeholder="Порядок" inputMode="numeric" />
              </div>
              <Textarea value={theoryForm.content} onChange={e => setTheoryForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Текст статьи (формулы — в $...$, абзацы — пустой строкой)" rows={10} />
              <Input value={theoryForm.tags} onChange={e => setTheoryForm(f => ({ ...f, tags: e.target.value }))} placeholder="Теги через запятую" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={tab === 'problems' ? saveProblem : saveTheory} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{deleteTarget?.title}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'problems'
                ? 'Задача будет удалена вместе с попытками пользователей. Действие необратимо.'
                : 'Статья будет удалена безвозвратно.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
