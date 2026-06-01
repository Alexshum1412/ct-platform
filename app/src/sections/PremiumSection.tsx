import { motion } from 'framer-motion';
import { Crown, CheckCircle, X, Zap, TrendingUp, Shield, BookOpen, Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const freeFeatures = [
  { text: '10 заданий в день', included: true },
  { text: 'Теория всех разделов', included: true },
  { text: 'Базовая статистика', included: true },
  { text: '1 пробный экзамен в неделю', included: true },
  { text: 'Неограниченные задания', included: false },
  { text: 'Полная аналитика слабых тем', included: false },
  { text: 'Задания уровней IV–V', included: false },
  { text: 'Защита серии', included: false },
];

const premiumFeatures = [
  { icon: Zap, text: 'Неограниченное решение заданий' },
  { icon: TrendingUp, text: 'Полная аналитика по разделам и уровням' },
  { icon: BookOpen, text: 'Эксклюзивные задания уровней IV–V' },
  { icon: Shield, text: 'Защита серии — 1 пропуск/месяц' },
  { icon: Trophy, text: 'Симулятор ЦТ — 32 задания, 210 минут' },
  { icon: Star, text: 'Полный разбор ошибок после экзамена' },
  { icon: Crown, text: 'Значок 👑 в профиле и рейтинге' },
  { icon: BookOpen, text: 'Приоритет в новом контенте' },
];

export function PremiumSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge className="mb-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
              <Crown className="w-3 h-3 mr-1" />Premium
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Готовьтесь без ограничений
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Поддержите платформу и получите полный доступ ко всем функциям.
              Premium помогает нам создавать больше качественных заданий и поддерживать сервис бесплатно для всех.
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {/* Free */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <div className="bg-card border border-border rounded-2xl p-6 h-full">
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1">Бесплатно</h3>
                <p className="text-4xl font-bold">0 BYN</p>
                <p className="text-muted-foreground text-sm mt-1">навсегда</p>
              </div>
              <ul className="space-y-3 mb-6">
                {freeFeatures.map(({ text, included }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    {included ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={included ? '' : 'text-muted-foreground/60'}>{text}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate('/register')}>
                Начать бесплатно
              </Button>
            </div>
          </motion.div>

          {/* Premium Monthly */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-6 h-full relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white border-0 px-3">Популярный</Badge>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold">Premium</h3>
                </div>
                <p className="text-4xl font-bold">15 <span className="text-xl font-normal">BYN</span></p>
                <p className="text-muted-foreground text-sm mt-1">в месяц</p>
              </div>
              <ul className="space-y-3 mb-6">
                {premiumFeatures.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate('/contact')} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                <Crown className="w-4 h-4 mr-2" />
                Подключить Premium
              </Button>
            </div>
          </motion.div>

          {/* Premium Annual */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <div className="bg-card border border-border rounded-2xl p-6 h-full relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500 text-white border-0 px-3">Экономия 31%</Badge>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold">Premium Год</h3>
                </div>
                <p className="text-4xl font-bold">99 <span className="text-xl font-normal">BYN</span></p>
                <p className="text-muted-foreground text-sm mt-1">в год (~8.25 BYN/мес)</p>
              </div>
              <ul className="space-y-3 mb-6">
                {premiumFeatures.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm font-semibold text-green-600">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  +2 месяца бесплатно
                </li>
              </ul>
              <Button onClick={() => navigate('/contact')} variant="outline" className="w-full border-amber-400 text-amber-700 hover:bg-amber-50">
                <Crown className="w-4 h-4 mr-2" />
                Подключить на год
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Why premium */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-muted/50 rounded-2xl p-6 max-w-3xl mx-auto text-center">
          <h3 className="font-semibold mb-2">Почему нужен Premium?</h3>
          <p className="text-sm text-muted-foreground">
            CT-Platform существует на поддержку пользователей. Premium-подписки помогают нам добавлять новые задания,
            поддерживать сервер и разрабатывать новые функции. Базовая версия остаётся бесплатной навсегда.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
