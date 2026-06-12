/**
 * Hero главной — асимметричная премиум-подача: слева сильный заголовок с
 * тёмно-синим градиентом и CTA, справа (xl+) «витрина продукта» — стеклянный
 * мокап карточки задания с плавающими чипами. Ниже — live-метрики платформы.
 * Аврора + сетка в фоне, всё уважает prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  GraduationCap, BookOpen, Target, ArrowRight, Users, Zap,
  CheckCircle2, Flame, Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface PlatformStats {
  totalQuestions: number;
  totalUsers: number;
  totalSolved: number;
  totalSubjects: number;
  totalTopics: number;
  todaySolved: number;
}

interface HeroSectionProps {
  onStartLearning?: () => void;
}

/** Плавный count-up до значения (однократно, при появлении данных). */
function useCountUp(target: number | null, durationMs = 1400): number | null {
  const [value, setValue] = useState<number | null>(null);
  const prefersReduced = useReducedMotion();
  const startedFor = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) return;
    if (startedFor.current === target) return;
    startedFor.current = target;
    if (prefersReduced || target <= 0) { setValue(target); return; }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, prefersReduced]);

  return value;
}

const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('ru-RU'));

export function HeroSection({ onStartLearning }: HeroSectionProps) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    void apiClient('/stats/platform').then(res => {
      if (res.data) setStats(res.data as PlatformStats);
    });
  }, []);

  const questions = useCountUp(stats?.totalQuestions ?? null);
  const users = useCountUp(stats?.totalUsers ?? null, 1000);
  const today = useCountUp(stats?.todaySolved ?? null, 1000);

  const float = prefersReduced
    ? {}
    : { animate: { y: [0, -8, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const } };
  const floatSlow = prefersReduced
    ? {}
    : { animate: { y: [0, 7, 0] }, transition: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.8 } };

  return (
    <section className="relative overflow-hidden pt-14 pb-16 lg:pt-24 lg:pb-24">
      {/* ФОН: глубокая тёмно-синяя аврора + сетка */}
      <div className="absolute inset-0 -z-10">
        <div className="aurora-blob w-[36rem] h-[36rem] -top-44 -left-32 bg-primary/30" />
        <div className="aurora-blob w-[30rem] h-[30rem] top-16 -right-28 bg-blue-700/25" style={{ animationDelay: '-6s' }} />
        <div className="aurora-blob w-[22rem] h-[22rem] bottom-0 left-1/3 bg-violet-500/15" style={{ animationDelay: '-11s' }} />
        <div className="absolute inset-0 bg-grid-faint" />
      </div>

      <div className="relative container">
        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-12 xl:gap-8 items-center">
          {/* ===== Левая колонка: текст + CTA ===== */}
          <div className="text-center xl:text-left max-w-2xl mx-auto xl:mx-0">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-7">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                ЦТ и ЦЭ 2027 · программа РИКЗ · Беларусь
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
              className="text-[2.7rem] leading-[1.05] md:text-6xl xl:text-[4.2rem] font-extrabold tracking-tight mb-6"
            >
              Сдай ЦТ на{' '}
              <span className="text-gradient-animated">максимум</span>
              <span className="block mt-2 text-[1.6rem] md:text-4xl xl:text-[2.4rem] text-muted-foreground font-bold">
                без репетиторов и переплат
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }}
              className="text-lg md:text-xl text-muted-foreground mb-9 max-w-xl mx-auto xl:mx-0"
            >
              2000+ заданий с разборами, вся теория, пробные варианты в формате
              реального экзамена и олимпиадный трек — в одной платформе.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center xl:justify-start justify-center gap-4"
            >
              <Button size="lg" onClick={onStartLearning} className="btn-shine gap-2 text-lg px-8 shadow-xl shadow-primary/30">
                <BookOpen className="w-5 h-5" />
                Начать бесплатно
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="glass gap-2 text-lg px-8 border-border/60" onClick={() => navigate('/exam/math')}>
                <Target className="w-5 h-5" />
                Пробный вариант
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="mt-5 text-xs text-muted-foreground flex items-center xl:justify-start justify-center gap-4 flex-wrap"
            >
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Бесплатный старт</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Без карты</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Тестовый балл как на ЦТ</span>
            </motion.p>
          </div>

          {/* ===== Правая колонка (xl+): витрина продукта ===== */}
          <motion.div
            initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="relative hidden xl:block select-none"
            aria-hidden="true"
          >
            {/* Свечение позади мокапа */}
            <div className="absolute inset-8 rounded-[2.5rem] bg-primary/20 blur-[60px]" />

            {/* Мокап карточки задания */}
            <motion.div {...float} className="relative glass rounded-3xl border border-border/70 shadow-2xl shadow-primary/10 p-6 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </span>
                  Математика · Часть А
                </span>
                <span className="text-xs font-mono text-muted-foreground">#A-014</span>
              </div>
              <p className="font-semibold mb-4 leading-snug">
                Найдите значение выражения 2³ · 2⁵ : 2⁶
              </p>
              <div className="space-y-2 mb-4">
                {[
                  { id: 'А', text: '2', ok: false },
                  { id: 'Б', text: '4', ok: true },
                  { id: 'В', text: '8', ok: false },
                ].map(o => (
                  <div
                    key={o.id}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-sm ${
                      o.ok
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-border bg-background/60'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${o.ok ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>
                      {o.id}
                    </span>
                    {o.text}
                    {o.ok && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-primary/[0.07] border border-primary/15 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-primary">Разбор: </span>
                2³⁺⁵⁻⁶ = 2² = 4. Свойства степеней — раздел 1 теории.
              </div>
            </motion.div>

            {/* Плавающие чипы */}
            <motion.div
              {...floatSlow}
              className="absolute -right-2 top-6 glass rounded-2xl border border-border/70 shadow-xl px-4 py-3 flex items-center gap-2.5"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-bold leading-none">Серия 12 🔥</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">+10 XP за ответ</p>
              </div>
            </motion.div>

            <motion.div
              {...float}
              className="absolute -left-4 bottom-10 glass rounded-2xl border border-border/70 shadow-xl px-4 py-3 flex items-center gap-2.5"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-bold leading-none">Тестовый балл 87</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">пробный вариант ЦТ</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== МЕТРИКИ ===== */}
        <motion.div
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-14 lg:mt-20 max-w-4xl mx-auto"
        >
          <Stat icon={BookOpen} value={fmt(questions)} label="Заданий" sub="по программе РИКЗ" />
          <Stat icon={GraduationCap} value={stats ? String(stats.totalSubjects) : '—'} label="Предметов" sub="ЦТ/ЦЭ Беларуси" />
          <Stat icon={Users} value={fmt(users)} label="Учеников" sub="уже готовятся" />
          <Stat icon={Zap} value={fmt(today)} label="Решено сегодня" sub="обновляется live" highlight />
        </motion.div>
      </div>
    </section>
  );
}

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  sub: string;
  highlight?: boolean;
}

function Stat({ icon: Icon, value, label, sub, highlight }: StatProps) {
  return (
    <div className="glass rounded-2xl px-4 py-5 text-center card-lift">
      <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-emerald-500' : 'text-primary'}`} />
      <p className={`text-2xl md:text-3xl font-extrabold tabular-nums ${highlight ? 'text-emerald-500' : ''}`}>{value}</p>
      <p className="text-sm font-semibold mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
