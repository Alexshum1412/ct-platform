/**
 * Global toast stack. Renders the notifications held in the app store
 * (level-ups, achievement unlocks, action feedback). The store auto-removes
 * each notification after its duration; this component just displays them.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const ICON = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const ICON_COLOR: Record<string, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-primary',
};

export function NotificationStack() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,24rem)] pointer-events-none">
      <AnimatePresence initial={false}>
        {notifications.map((n) => {
          const Icon = ICON[n.type] ?? Info;
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card text-card-foreground shadow-lg p-4"
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${ICON_COLOR[n.type] ?? 'text-primary'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug">{n.title}</p>
                {n.message && <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.message}</p>}
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="p-1 -m-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
                aria-label="Закрыть уведомление"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
