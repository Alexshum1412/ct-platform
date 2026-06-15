import { useCallback, useEffect, useRef, useState } from 'react';
import { Newspaper, Plus, Trash2, Loader2, Pencil, Pin, ImagePlus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminNewsApi, type NewsArticle, type NewsCategory, type NewsInput } from '@/lib/api/client';
import { imageToDataUrl } from '@/lib/imageToDataUrl';

const CATS: { id: NewsCategory; label: string }[] = [
  { id: 'PERMANENT', label: 'Постоянная информация' },
  { id: 'NEWS', label: 'Новости и слухи' },
  { id: 'UPDATE', label: 'Обновления сайта' },
];
const empty: NewsInput = { title: '', excerpt: '', content: '', category: 'NEWS', published: true, pinned: false, imageUrl: null };

export function NewsManager({ token }: { token: string | null }) {
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [form, setForm] = useState<NewsInput>(empty);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<NewsArticle | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    void adminNewsApi.list(token).then((r) => setItems(r.data?.items ?? [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  const openCreate = () => { setEditing(null); setForm(empty); setErr(null); setShowForm(true); };
  const openEdit = (a: NewsArticle) => {
    setEditing(a);
    setForm({ title: a.title, excerpt: a.excerpt, content: a.content, category: a.category, published: a.published, pinned: a.pinned, imageUrl: a.imageUrl });
    setErr(null); setShowForm(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.title?.trim() || !form.content?.trim()) { setErr('Заполните заголовок и текст'); return; }
    setSaving(true); setErr(null);
    const res = editing ? await adminNewsApi.update(editing.id, form, token) : await adminNewsApi.create(form, token);
    setSaving(false);
    if (res.data) { setShowForm(false); load(); } else setErr(res.error || 'Не удалось сохранить');
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    try { const url = await imageToDataUrl(f); setForm((p) => ({ ...p, imageUrl: url })); } catch { setErr('Не удалось обработать изображение'); }
  };

  const doDelete = async () => {
    if (!token || !deleting) return;
    const id = deleting.id; setDeleting(null);
    setItems((p) => p.filter((x) => x.id !== id));
    await adminNewsApi.remove(id, token);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Newspaper className="w-5 h-5 text-primary" />Новостная лента</h2>
          <p className="text-sm text-muted-foreground">Статьи и информация для раздела «Новости» · всего {items.length}</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Новая статья</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input value={form.title ?? ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Заголовок" />
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as NewsCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input value={form.excerpt ?? ''} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} placeholder="Краткое описание (для карточки)" />
            <Textarea value={form.content ?? ''} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Текст статьи (поддерживается markdown)" rows={8} />
            <div className="flex items-center gap-3 flex-wrap">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5"><ImagePlus className="w-4 h-4" />Фото</Button>
              {form.imageUrl && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <img src={form.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" />
                  <button onClick={() => setForm((p) => ({ ...p, imageUrl: null }))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                </span>
              )}
              <label className="flex items-center gap-2 text-sm ml-auto"><Switch checked={!!form.published} onCheckedChange={(v) => setForm((p) => ({ ...p, published: v }))} />Опубликовано</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.pinned} onCheckedChange={(v) => setForm((p) => ({ ...p, pinned: v }))} />Закрепить</label>
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
              <Button onClick={save} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{editing ? 'Сохранить' : 'Создать'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {loading ? (
            <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Статей пока нет</p>
          ) : items.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3.5">
              {a.imageUrl ? <img src={a.imageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0" /> : <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0"><Newspaper className="w-5 h-5 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{a.title}</span>
                  {a.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  {!a.published && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">черновик</span>}
                </div>
                <p className="text-xs text-muted-foreground">{CATS.find((c) => c.id === a.category)?.label} · {new Date(a.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(a)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить «{deleting?.title}»?</AlertDialogTitle><AlertDialogDescription>Статья будет удалена безвозвратно.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NewsManager;
