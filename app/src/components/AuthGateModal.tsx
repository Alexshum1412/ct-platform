/**
 * AuthGateModal — окно-«стена регистрации» для гостей.
 *
 * Все действия на платформе (решение заданий, избранное, экзамены, игры и т.д.)
 * доступны только зарегистрированным пользователям. Когда гость пытается выполнить
 * такое действие, вызывается store.requireAuth(), который открывает это окно.
 *
 * Управляется глобально через useAppStore (authGateOpen / authGateMessage).
 * Рендерится один раз в Layout.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, X, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

const perks = [
  'Решение заданий с проверкой и объяснениями',
  'Сохранение прогресса, избранного и серий',
  'Пробные экзамены в формате ЦТ/ЦЭ',
  'Достижения, рейтинг и статистика',
];

export function AuthGateModal() {
  const navigate = useNavigate();
  const { authGateOpen, authGateMessage, closeAuthGate } = useAppStore();

  const go = (path: string) => {
    closeAuthGate();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {authGateOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeAuthGate(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary via-indigo-500 to-purple-600 p-6 text-white">
              <button
                onClick={closeAuthGate}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Нужна регистрация</h2>
                  <p className="text-white/80 text-sm">Доступно только участникам платформы</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                {authGateMessage
                  ? authGateMessage
                  : 'Чтобы пользоваться этой функцией, войдите или создайте бесплатный аккаунт — это займёт меньше минуты.'}
              </p>

              <div className="space-y-2.5 mb-6">
                {perks.map((p) => (
                  <div key={p} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm">{p}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full gap-2" size="lg" onClick={() => go('/register')}>
                <UserPlus className="w-4 h-4" />
                Зарегистрироваться бесплатно
              </Button>
              <Button variant="outline" className="w-full gap-2 mt-2" onClick={() => go('/login')}>
                <LogIn className="w-4 h-4" />
                У меня уже есть аккаунт
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AuthGateModal;
