import { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, Plus, Trash2, Loader2, Pencil, ImagePlus, X } from 'lucide-react';
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
import { adminBannerApi, type Banner, type BannerInput } from '@/lib/api/client';
import { imageToDataUrl } from '@/lib/imageToDataUrl';

const TYPES = [['info', 'Информация'], ['warning', 'Предупреждение'], ['maintenance', 'Техработы'], ['promo', 'Реклама/промо'], ['success', 'Успех']] as const;
const LOCS = [['top', 'Вверху страницы'], ['bottom', 'Внизу (фикс.)'], ['modal', 'Окно по центру']] as const;
const SIZES = [['small', 'Маленький'], ['medium', 'Средний'], ['large', 'Большой']] as const;

const empty: BannerInput = { title: '', content: '', type: 'info', location: 'top', size: 'medium', active: true, dismissible: true, priority: 0, imageUrl: null, startsAt: null, endsAt: null, linkUrl: null, linkLabel: null };
const toLocal = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export function BannerManager({ token }: { token: string | null }) {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerInput>(empty);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    void adminBannerApi.list(token).then((r) => setItems(r.data?.items ?? [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  const openCreate = () => { setEditing(null); setForm(empty); setErr(null); setShowForm(true); };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({ title: b.title, content: b.content, type: b.type, location: b.location, size: b.size, active: b.active, dismissible: b.dismissible, priority: b.priority, imageUrl: b.imageUrl, startsAt: b.startsAt, endsAt: b.endsAt, linkUrl: b.linkUrl, linkLabel: b.linkLabel });
    setErr(null); setShowForm(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.title?.trim() || !form.content?.trim()) { setErr('Заполните заголовок и текст'); return; }
    setSaving(true); setErr(null);
    const res = editing ? await adminBannerApi.update(editing.id, form, token) : await adminBannerApi.create(form, token);
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
    await adminBannerApi.remove(id, token);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" />Баннеры</h2>
          <p className="text-sm text-muted-foreground">Временные объявления: ЧП, техработы, реклама · всего {items.length}</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Новый баннер</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <Input value={form.title ?? ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Заголовок" />
            <Textarea value={form.content ?? ''} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Текст объявления" rows={3} />
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Тип</label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Расположение</label>
                <Select value={form.location} onValueChange={(v) => setForm((p) => ({ ...p, location: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOCS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Размер</label>
                <Select value={form.size} onValueChange={(v) => setForm((p) => ({ ...p, size: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SIZES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Показывать с</label>
                <Input type="datetime-local" value={toLocal(form.startsAt)} onChange={(e) => setForm((p) => ({ ...p, startsAt: toIso(e.target.value) }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Скрыть после</label>
                <Input type="datetime-local" value={toLocal(form.endsAt)} onChange={(e) => setForm((p) => ({ ...p, endsAt: toIso(e.target.value) }))} /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input value={form.linkUrl ?? ''} onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value || null }))} placeholder="Ссылка (необязательно)" />
              <Input value={form.linkLabel ?? ''} onChange={(e) => setForm((p) => ({ ...p, linkLabel: e.target.value || null }))} placeholder="Текст ссылки" />
              <Input type="number" value={form.priority ?? 0} onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))} placeholder="Приоритет" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5"><ImagePlus className="w-4 h-4" />Фото</Button>
              {form.imageUrl && (
                <span className="inline-flex items-center gap-1.5 text-sm"><img src={form.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" /><button onClick={() => setForm((p) => ({ ...p, imageUrl: null }))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button></span>
              )}
              <label className="flex items-center gap-2 text-sm ml-auto"><Switch checked={!!form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />Активен</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.dismissible} onCheckedChange={(v) => setForm((p) => ({ ...p, dismissible: v }))} />Можно закрыть</label>
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
            <div className="p-4 space-y-2">{[0, 1].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Баннеров пока нет</p>
          ) : items.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-3.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate">{b.title}</span>
                <p className="text-xs text-muted-foreground">{TYPES.find(([v]) => v === b.type)?.[1]} · {LOCS.find(([v]) => v === b.location)?.[1]} · приоритет {b.priority}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(b)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить баннер «{deleting?.title}»?</AlertDialogTitle><AlertDialogDescription>Баннер будет удалён безвозвратно.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BannerManager;
