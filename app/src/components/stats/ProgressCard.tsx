import { motion } from 'framer-motion';
import { TrendingUp, Target, Clock, Award, BookOpen, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { UserStats, SubjectStats } from '@/types';

interface ProgressCardProps {
  stats: UserStats;
}

export function ProgressCard({ stats }: ProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Ваша статистика
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatItem
            icon={BookOpen}
            value={stats.totalSolved}
            label="Решено"
            color="text-blue-500"
          />
          <StatItem
            icon={Target}
            value={`${stats.accuracy}%`}
            label="Точность"
            color="text-green-500"
          />
          <StatItem
            icon={Clock}
            value={`${Math.round(stats.totalTime / 60)}`}
            label="Минут"
            color="text-purple-500"
          />
        </div>
        
        {/* Streak */}
        {stats.streakDays > 0 && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <Award className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400">
                {stats.streakDays} дней подряд!
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Продолжайте в том же духе!
              </p>
            </div>
          </div>
        )}
        
        {/* Subject Progress */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Прогресс по предметам
          </h4>
          {stats.bySubject.map((subject, index) => (
            <SubjectProgress key={subject.subjectId} subject={subject} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
}

function StatItem({ icon: Icon, value, label, color }: StatItemProps) {
  return (
    <div className="text-center p-4 bg-muted/50 rounded-xl">
      <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

interface SubjectProgressProps {
  subject: SubjectStats;
  index: number;
}

function SubjectProgress({ subject, index }: SubjectProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{subject.subjectName}</span>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            {subject.correctCount}/{subject.totalSolved}
          </span>
          <span className="font-medium text-foreground">{subject.accuracy}%</span>
        </div>
      </div>
      <Progress value={subject.accuracy} className="h-2" />
    </motion.div>
  );
}
