import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { SubjectGrid } from '@/components/subject/SubjectGrid';
import type { Subject } from '@/types';

interface SubjectsSectionProps {
  onSubjectClick?: (subject: Subject) => void;
}

export function SubjectsSection({ onSubjectClick }: SubjectsSectionProps) {
  return (
    <section className="relative overflow-hidden py-20 bg-muted/30">
      {/* Декоративный фон: мягкая аврора + тонкая сетка */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute -bottom-24 right-1/5 w-[26rem] h-[26rem] rounded-full bg-violet-500/10 blur-[90px]" />
        <div className="absolute inset-0 bg-grid-faint opacity-60" />
      </div>

      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 ring-1 ring-primary/15">
            <BookOpen className="w-4 h-4" />
            Выберите предмет
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Предметы для <span className="text-gradient-animated">подготовки</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите предмет, к которому хотите подготовиться.
            Каждый предмет содержит задания разных типов и подробную теорию.
          </p>
        </motion.div>

        {/* Subject Grid */}
        <SubjectGrid onSubjectClick={onSubjectClick} />
      </div>
    </section>
  );
}
