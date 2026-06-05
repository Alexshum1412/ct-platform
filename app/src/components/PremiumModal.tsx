import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, CheckCircle, X, Clock, BookOpen, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'daily_limit' | 'premium_feature';
  dailyCount?: number;
  dailyLimit?: number;
  resetAt?: string;
}

const premiumFeatures = [
  { icon: Zap, text: 'Неограниченное решение заданий' },
  { icon: TrendingUp, text: 'Полная аналитика по разделам и уровням' },
  { icon: BookOpen, text: 'Задания уровней IV–V (ЦТ повышенной сложности)' },
  { icon: Shield, text: 'Защита серии — 1 пропуск в месяц' },
  { icon: Crown, text: 'Значок 👑 в профиле и рейтинге' },
  { icon: CheckCircle, text: 'Симулятор ЦТ — полный вариант 210 минут' },
];

export function PremiumModal({ isOpen, onClose, reason = 'daily_limit', dailyCount = 10, dailyLimit = 10, resetAt }: PremiumModalProps) {
  const navigate = useNavigate();
  const resetTime = resetAt ? new Date(resetAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '00:00';
  const goToPayment = () => { onClose(); navigate('/payment'); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-6 text-white">
              <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">CT-Platform Premium</h2>
                  <p className="text-white/80 text-sm">Готовься без ограничений</p>
                </div>
              </div>

              {reason === 'daily_limit' && (
                <div className="bg-white/20 rounded-xl p-3 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Ты решил {dailyCount} из {dailyLimit} бесплатных заданий сегодня</span>
                  </div>
                  <div className="mt-2 h-2 bg-white/20 rounded-full">
                    <div className="h-full bg-white rounded-full" style={{ width: `${(dailyCount / dailyLimit) * 100}%` }} />
                  </div>
                  <p className="text-xs text-white/70 mt-1">Лимит сбросится в {resetTime}</p>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4 text-center">Что даёт Premium:</p>
              <div className="space-y-3 mb-6">
                {premiumFeatures.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold">15 BYN</p>
                  <p className="text-xs text-muted-foreground">в месяц</p>
                </div>
                <div className="border-2 border-amber-500 rounded-xl p-4 text-center relative">
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs">Выгодно!</Badge>
                  <p className="text-2xl font-bold">99 BYN</p>
                  <p className="text-xs text-muted-foreground">в год (−31%)</p>
                </div>
              </div>

              <Button onClick={goToPayment} className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold" size="lg">
                <Crown className="w-4 h-4 mr-2" />
                Получить Premium
              </Button>

              <Button variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={onClose}>
                {reason === 'daily_limit' ? `Продолжить завтра` : 'Не сейчас'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PremiumModal;
