import { motion } from 'framer-motion';
import { Calculator, PenTool, Atom, FlaskConical, Dna, Globe, Languages, BookOpen, ChevronRight, Scale, Map, Scroll, MessageCircle, FileText, Layers, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Subject } from '@/types';

type IconCmp = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
const iconMap: Record<string, IconCmp> = {
  Calculator, PenTool, Atom, FlaskConical, Dna, Globe, Languages, BookOpen,
  Scale, Map, Scroll, MessageCircle,
};

interface SubjectCardProps {
  subject: Subject;
  index: number;
  onClick?: () => void;
}

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n > 1 && n < 5 ? few : many;

export function SubjectCard({ subject, index, onClick }: SubjectCardProps) {
  const Icon = iconMap[subject.icon] || BookOpen;
  // Цвет предмета прокидываем CSS-переменной → используем color-mix для богатых
  // оттенков (градиенты/тинты/тени), не завися от формата цвета (hex/hsl).
  const cssVars = { ['--c' as string]: subject.color } as React.CSSProperties;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.07 }}
      whileHover={{ y: -6 }}
      className="group relative h-full"
      style={cssVars}
    >
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
        className="relative h-full overflow-hidden rounded-3xl border border-border/70 bg-card p-6 lg:p-7 cursor-pointer shadow-sm transition-[box-shadow,border-color,transform] duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ borderColor: undefined }}
      >
        {/* Тинт-градиент в цвете предмета (насыщается при наведении) */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(155deg, color-mix(in srgb, var(--c) 14%, transparent), transparent 58%)' }}
        />
        {/* Цветное свечение в углу */}
        <div
          aria-hidden
          className="absolute -top-14 -right-12 w-44 h-44 rounded-full blur-3xl opacity-25 group-hover:opacity-50 transition-opacity duration-500"
          style={{ background: 'var(--c)' }}
        />
        {/* Водяной знак-иконка */}
        <Icon
          aria-hidden
          className="absolute -bottom-7 -right-5 w-36 h-36 opacity-[0.07] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500 pointer-events-none"
          style={{ color: 'var(--c)' }}
        />
        {/* Верхняя акцент-полоса */}
        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
          style={{ background: 'linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 45%, #ffffff))' }}
        />

        <div className="relative">
          {/* Иконка + заголовок */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl text-white shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
              style={{
                background: 'linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 62%, #000000))',
                boxShadow: '0 10px 22px -8px color-mix(in srgb, var(--c) 75%, transparent)',
              }}
            >
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold tracking-tight mb-1">{subject.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{subject.description}</p>
            </div>
          </div>

          {/* Статистика — тинтованные пилюли с цветной точкой */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <StatPill icon={FileText} value={subject.stats.questionsCount} label={plural(subject.stats.questionsCount, 'задание', 'задания', 'заданий')} />
            <StatPill icon={Layers} value={subject.stats.topicsCount} label={plural(subject.stats.topicsCount, 'тема', 'темы', 'тем')} />
            {!!subject.stats.subtopicsCount && (
              <StatPill icon={ListTree} value={subject.stats.subtopicsCount} label={plural(subject.stats.subtopicsCount, 'подтема', 'подтемы', 'подтем')} />
            )}
          </div>

          {/* CTA */}
          <Button
            className="w-full btn-shine text-white border-0 font-semibold shadow-md transition-all duration-300 group-hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 68%, #000000))',
              boxShadow: '0 8px 20px -10px color-mix(in srgb, var(--c) 80%, transparent)',
            }}
          >
            <span>Начать подготовку</span>
            <ChevronRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function StatPill({ icon: Icon, value, label }: { icon: IconCmp; value: number; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-foreground/80"
      style={{ background: 'color-mix(in srgb, var(--c) 13%, transparent)' }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--c)' }} />
      <span className="tabular-nums">{value.toLocaleString('ru-RU')}</span> {label}
    </span>
  );
}
