/**
 * Hero главной страницы — премиум-подача: аврора-фон с мягкими движущимися
 * пятнами, тонкая сетка, анимированный градиент в заголовке, count-up метрики
 * и плавающие стеклянные карточки (desktop). Уважает prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { GraduationCap, BookOpen, Target, ArrowRight, Users, Zap, CheckCircle2 } from 'lucide-react';
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
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    void apiClient('/stats/platform').then(res => {
      if (res.data) setStats(res.data as PlatformStats);
    });
  }, []);

  const questions = useCountUp(stats?.totalQuestions ?? null);
  const users = useCountUp(stats?.totalUsers ?? null, 1000);
  const today = useCountUp(stats?.todaySolved ?? null, 1000);

  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
      {/* ФОН: аврора + сетка */}
      <div className="absolute inset-0 -z-10">
        <div className="aurora-blob w-[34rem] h-[34rem] -top-40 -left-32 bg-primary/30" />
        <div className="aurora-blob w-[28rem] h-[28rem] top-10 -right-24 bg-violet-500/25" style={{ animationDelay: '-6s' }} />
        <div className="aurora-blob w-[22rem] h-[22rem] bottom-0 left-1/3 bg-cyan-400/20" style={{ animationDelay: '-11s' }} />
        <div className="absolute inset-0 bg-grid-faint" />
      </div>

      <div className="relative container">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Подготовка к ЦТ и ЦЭ 2027 · Беларусь
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
            className="text-[2.6rem] leading-[1.08] md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
          >
            Сдай ЦТ на{' '}
            <span className="text-gradient-animated">максимум</span>
            <br className="hidden sm:block" />
            <span className="text-3xl md:text-5xl lg:text-[3.4rem] text-muted-foreground font-bold">
              {' '}без репетиторов
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Задания строго по программе РИКЗ с разборами и теорией, пробные экзамены
            в формате реального ЦТ/ЦЭ и олимпиадная подготовка — в одном месте.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" onClick={onStartLearning} className="btn-shine gap-2 text-lg px-8 shadow-xl shadow-primary/25">
              <BookOpen className="w-5 h-5" />
              Начать бесплатно
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="glass gap-2 text-lg px-8 border-border/60" onClick={() => navigate('/exam/math')}>
              <Target className="w-5 h-5" />
              Пробный экзамен
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-5 text-xs text-muted-foreground flex items-center justify-center gap-4 flex-wrap"
          >
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Бесплатный старт</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Без карты</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Тестовый балл как на ЦТ</span>
          </motion.p>

          {/* МЕТРИКИ: стеклянные карточки с count-up */}
          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.34 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-14"
          >
            <Stat icon={BookOpen} value={fmt(questions)} label="Заданий" sub="по программе РИКЗ" />
            <Stat icon={GraduationCap} value={stats ? String(stats.totalSubjects) : '—'} label="Предметов" sub="ЦТ/ЦЭ Беларуси" />
            <Stat icon={Users} value={fmt(users)} label="Учеников" sub="уже готовятся" />
            <Stat icon={Zap} value={fmt(today)} label="Решено сегодня" sub="обновляется live" highlight />
          </motion.div>
        </div>

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
