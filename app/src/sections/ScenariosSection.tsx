/**
 * «Всё для подготовки» — bento-сетка шести ключевых сценариев платформы:
 * теория, практика, пробные экзамены, олимпиады, прогресс, Premium.
 * Заменила пары generic-секций (Features + HowItWorks): меньше шума,
 * каждый блок — реальный сценарий с реальной ссылкой.
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen, Target, ClipboardList, Trophy, BarChart3, Crown, ArrowRight,
} from 'lucide-react';

interface Scenario {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  cta: string;
  /** градиент плитки-иконки */
  tile: string;
  /** large — широкая карточка в bento-сетке */
  large?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    to: '/practice/math',
    icon: Target,
    title: 'Практика по заданиям',
    desc: '2000+ заданий частей А и Б с мгновенной проверкой, подсказками и пошаговыми разборами. Фильтры по темам и сложности, режим «работа над ошибками».',
    cta: 'Решать задания',
    tile: 'from-primary to-blue-700',
    large: true,
  },
  {
    to: '/theory',
    icon: BookOpen,
    title: 'Теория',
    desc: '562 статьи по всем разделам программы: конспекты, типичные ошибки и ловушки экзамена.',
    cta: 'Открыть теорию',
    tile: 'from-sky-500 to-primary',
  },
  {
    to: '/exam/math',
    icon: ClipboardList,
    title: 'Пробные экзамены',
    desc: 'Полные варианты в формате ЦТ/ЦЭ: таймер, бланк ответов и тестовый балл по шкале РИКЗ.',
    cta: 'Пройти вариант',
    tile: 'from-violet-500 to-primary',
  },
  {
    to: '/olympiad',
    icon: Trophy,
    title: 'Олимпиады',
    desc: '178 задач всех этапов республиканской олимпиады с разборами и отдельным рейтингом.',
    cta: 'К олимпиадам',
    tile: 'from-amber-500 to-orange-600',
  },
  {
    to: '/profile',
    icon: BarChart3,
    title: 'Личный прогресс',
    desc: 'Статистика по темам, график активности, достижения и место в рейтинге — всё в кабинете.',
    cta: 'Мой кабинет',
    tile: 'from-emerald-500 to-teal-600',
  },
  {
    to: '/payment',
    icon: Crown,
    title: 'Premium',
    desc: 'Задания без дневного лимита, полная аналитика слабых тем и безлимитные пробные варианты.',
    cta: 'Подробнее',
    tile: 'from-amber-400 to-orange-500',
  },
];

export function ScenariosSection() {
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
            Один сервис — весь путь подготовки
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Всё для подготовки —{' '}
            <span className="bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent">в одном месте</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            От первого конспекта до пробного варианта на максимальный балл.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {SCENARIOS.map((s, i) => (
            <motion.div
              key={s.to}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className={s.large ? 'sm:col-span-2' : ''}
            >
              <Link
                to={s.to}
                className="group relative flex flex-col h-full overflow-hidden rounded-3xl border bg-card/70 p-6 md:p-7 card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* мягкое свечение в углу карточки */}
                <div className={`absolute -top-16 -right-12 w-48 h-48 rounded-full bg-gradient-to-br ${s.tile} opacity-[0.08] blur-2xl pointer-events-none group-hover:opacity-[0.16] transition-opacity`} />
                <div className="relative flex items-start justify-between gap-3 mb-4">
                  <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.tile} shadow-lg shadow-primary/15 flex items-center justify-center`}>
                    <s.icon className="w-6 h-6 text-white" />
                  </span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/50 transition-all group-hover:text-primary group-hover:translate-x-1" />
                </div>
                <h3 className="relative text-lg md:text-xl font-bold mb-1.5">{s.title}</h3>
                <p className="relative text-sm md:text-[0.95rem] text-muted-foreground leading-relaxed flex-1">{s.desc}</p>
                <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {s.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
