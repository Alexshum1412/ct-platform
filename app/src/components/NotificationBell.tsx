/**
 * Колокольчик уведомлений в хедере: бейдж непрочитанных, дропдаун с последними
 * уведомлениями, отметка прочитанности при открытии. Лёгкий поллинг раз в 90 с.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Award, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/useAppStore';
import { notificationsApi, type NotificationRow } from '@/lib/api/client';

const POLL_MS = 90_000;

const typeIcon = (type: string) =>
  type === 'ACHIEVEMENT' ? <Award className="w-4 h-4 text-amber-500" /> : <Info className="w-4 h-4 text-primary" />;

const timeAgo = (iso: string): string => {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export function NotificationBell() {
  const navigate = useNavigate();
  const token = useAppStore((s) => s.token);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const r = await notificationsApi.list(token);
    if (r.data) {
      setItems(r.data.notifications);
      setUnread(r.data.unreadCount);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [isAuthenticated, token, load]);

  // Открытие дропдауна помечает всё прочитанным (бейдж гаснет).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unread > 0 && token) {
      void notificationsApi.markRead({ all: true }, token).then(() => {
        setUnread(0);
        setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0" aria-label="Уведомления">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-semibold text-sm">Уведомления</p>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-25" />
            Пока пусто — здесь появятся достижения и новости.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (n.actionUrl) navigate(n.actionUrl);
                }}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${n.isRead ? '' : 'bg-primary/5'}`}
              >
                <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{n.title}</span>
                  <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  <span className="block text-[11px] text-muted-foreground/70 mt-0.5">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
