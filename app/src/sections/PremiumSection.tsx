/**
 * Секция Premium на главной — витрина тарифов сразу после каталога предметов.
 * Тёмная панель с авророй и сеткой (единый язык с OlympiadSection), glass-карточки
 * тарифов, выделенный «Популярный» план, CTA → /payment.
 */
import { motion } from 'framer-motion';
import { Crown, CheckCircle, X, Zap, TrendingUp, Shield, BookOpen, Trophy, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const freeFeatures = [
  { text: '10 заданий в день', included: true },
  { text: 'Теория всех разделов', included: true },
  { text: 'Базовая статистика', included: true },
  { text: '1 пробный экзамен в день', included: true },
  { text: 'Неограниченные задания', included: false },
  { text: 'Полная аналитика слабых тем', included: false },
  { text: 'Безлимит в мини-играх', included: false },
];

const premiumFeatures = [
  { icon: Zap, text: 'Неограниченное решение заданий' },
  { icon: TrendingUp, text: 'Полная аналитика по разделам' },
  { icon: Trophy, text: 'Пробные варианты без лимитов' },
  { icon: Shield, text: 'Безлимитные сбросы в мини-играх' },
  { icon: Star, text: 'Полный разбор ошибок после экзамена' },
  { icon: Crown, text: 'Значок 👑 в профиле и рейтинге' },
  { icon: BookOpen, text: 'Приоритет в новом контенте' },
];

export function PremiumSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20" id="premium">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-8 md:p-14 shadow-2xl"
        >
          {/* Аврора на тёмном */}
          <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-amber-500/25 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-28 -left-16 w-[28rem] h-[28rem] rounded-full bg-violet-600/30 blur-[100px] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse at 70% 30%, black 25%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 70% 30%, black 25%, transparent 75%)',
            }}
          />

          <div className="relative">
            {/* Заголовок */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-300 text-sm font-semibold mb-6">
                <Crown className="w-4 h-4" />
                Premium
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
                Готовьтесь{' '}
                <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">без ограничений</span>
              </h2>
              <p className="text-white/70 text-lg">
                Полный доступ ко всем функциям платформы. Premium помогает нам делать
                больше качественных заданий — базовая версия остаётся бесплатной навсегда.
              </p>
            </div>

            {/* Тарифы */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
              {/* Free */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 flex flex-col"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1 text-white/90">Бесплатно</h3>
                  <p className="text-4xl font-extrabold">0 <span className="text-xl font-normal text-white/60">BYN</span></p>
                  <p className="text-white/50 text-sm mt-1">навсегда</p>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {freeFeatures.map(({ text, included }) => (
                    <li key={text} className="flex items-center gap-3 text-sm">
                      {included ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-white/25 shrink-0" />
                      )}
                      <span className={included ? 'text-white/85' : 'text-white/35'}>{text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => navigate('/register')}
                >
                  Начать бесплатно
                </Button>
              </motion.div>

              {/* Premium месяц — выделенный */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                className="relative rounded-2xl border-2 border-amber-400/70 bg-gradient-to-b from-amber-400/15 to-orange-500/10 backdrop-blur-sm p-6 flex flex-col shadow-[0_0_50px_-12px_rgba(251,191,36,0.45)]"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-xs font-bold px-3.5 py-1.5 shadow-lg">
                    <Star className="w-3 h-3" />Популярный
                  </span>
                </div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-amber-300" />
                    <h3 className="text-lg font-bold">Premium</h3>
                  </div>
                  <p className="text-4xl font-extrabold">15 <span className="text-xl font-normal text-white/60">BYN</span></p>
                  <p className="text-white/50 text-sm mt-1">в месяц</p>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {premiumFeatures.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                      <Icon className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate('/payment')}
                  className="w-full btn-shine bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold hover:opacity-95 shadow-lg shadow-amber-500/30 border-0"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Подключить Premium
                </Button>
              </motion.div>

              {/* Premium год */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 flex flex-col"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 shadow-lg">
                    Экономия 45%
                  </span>
                </div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-amber-300" />
                    <h3 className="text-lg font-bold">Premium Год</h3>
                  </div>
                  <p className="text-4xl font-extrabold">99 <span className="text-xl font-normal text-white/60">BYN</span></p>
                  <p className="text-white/50 text-sm mt-1">в год (~8,25 BYN/мес)</p>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {premiumFeatures.slice(0, 5).map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                      <Icon className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3 text-sm font-semibold text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Всё из Premium + 2 месяца бесплатно
                  </li>
                </ul>
                <Button
                  onClick={() => navigate('/payment')}
                  variant="outline"
                  className="w-full border-amber-400/50 bg-transparent text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                >
                  Подключить на год
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>

            {/* Почему Premium */}
            <p className="text-center text-sm text-white/50 max-w-2xl mx-auto">
              CT-Platform существует на поддержку пользователей: подписки помогают добавлять новые
              задания, держать сервер и развивать платформу. Отменить можно в любой момент.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
