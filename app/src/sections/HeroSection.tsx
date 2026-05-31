import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Target, ArrowRight, Users, Zap } from 'lucide-react';
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

export function HeroSection({ onStartLearning }: HeroSectionProps) {
  const navigate = useNavigate();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    void apiClient('/stats/platform').then(res => {
      if (res.data) setPlatformStats(res.data as PlatformStats);
    });
  }, []);

  const formatNum = (n: number) => {
    if (n >= 1000) return `${Math.floor(n / 100) / 10}K+`;
    return `${n}+`;
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-primary/10 to-transparent opacity-50" />

      <div className="relative container">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <GraduationCap className="w-4 h-4" />
              Подготовка к ЦТ и ЦЭ 2027 · Беларусь
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Готовьтесь к экзаменам{' '}
            <span className="text-primary">эффективно</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Задания строго по программе РИКЗ с подробными решениями и теорией.
            Пробные экзамены в формате реального ЦТ/ЦЭ с тестовыми баллами.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={onStartLearning} className="gap-2 text-lg px-8">
              <BookOpen className="w-5 h-5" />
              Начать бесплатно
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="gap-2 text-lg px-8" onClick={() => navigate('/subject/math')}>
              <Target className="w-5 h-5" />
              Пробный экзамен
            </Button>
          </motion.div>

          {/* Dynamic Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-16 border-t border-border">
            <Stat
              icon={BookOpen}
              value={platformStats ? formatNum(platformStats.totalQuestions) : '—'}
              label="Заданий"
              sub="по программе РИКЗ"
            />
            <Stat
              icon={GraduationCap}
              value={platformStats ? String(platformStats.totalSubjects) : '—'}
              label="Предметов"
              sub="ЦТ/ЦЭ Беларуси"
            />
            <Stat
              icon={Users}
              value={platformStats ? formatNum(platformStats.totalUsers) : '—'}
              label="Учеников"
              sub="уже готовятся"
            />
            <Stat
              icon={Zap}
              value={platformStats ? formatNum(platformStats.todaySolved) : '—'}
              label="Решено сегодня"
              sub="в реальном времени"
              highlight
            />
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
    <div className="text-center">
      <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-green-500' : 'text-primary'}`} />
      <p className={`text-2xl md:text-3xl font-bold ${highlight ? 'text-green-500' : 'text-primary'}`}>{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
