import { motion } from 'framer-motion';
import { Calculator, PenTool, Atom, FlaskConical, Dna, Globe, Languages, BookOpen, ChevronRight, Scale, Map, Scroll, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Subject } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator, PenTool, Atom, FlaskConical, Dna, Globe, Languages, BookOpen,
  Scale, Map, Scroll, MessageCircle,
};

interface SubjectCardProps {
  subject: Subject;
  index: number;
  onClick?: () => void;
}

export function SubjectCard({ subject, index, onClick }: SubjectCardProps) {
  const Icon = iconMap[subject.icon] || BookOpen;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative"
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 lg:p-7 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20 cursor-pointer h-full"
        onClick={onClick}
      >
        {/* Gradient background on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
          style={{ background: subject.color }}
        />
        
        {/* Icon and Title */}
        <div className="flex items-start gap-4 mb-4">
          <div 
            className="flex items-center justify-center w-14 h-14 rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-105"
            style={{ background: subject.color }}
          >
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {subject.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {subject.description}
            </p>
          </div>
        </div>
        
        {/* Stats — rating removed per requirement */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <Badge variant="secondary" className="text-xs font-medium">
            {subject.stats.questionsCount} {subject.stats.questionsCount === 1 ? 'задание' : subject.stats.questionsCount < 5 ? 'задания' : 'заданий'}
          </Badge>
          <Badge variant="secondary" className="text-xs font-medium">
            {subject.stats.topicsCount} {subject.stats.topicsCount === 1 ? 'тема' : subject.stats.topicsCount < 5 ? 'темы' : 'тем'}
          </Badge>
        </div>
        
        {/* Action Button */}
        <Button 
          className="w-full group/btn transition-all duration-300"
          style={{ 
            background: subject.color,
            '--tw-bg-opacity': 1 
          } as React.CSSProperties}
        >
          <span>Начать подготовку</span>
          <ChevronRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover/btn:translate-x-1" />
        </Button>
      </div>
    </motion.div>
  );
}
