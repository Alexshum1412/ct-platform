import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { SubjectGrid } from '@/components/subject/SubjectGrid';
import type { Subject } from '@/types';

interface SubjectsSectionProps {
  onSubjectClick?: (subject: Subject) => void;
}

export function SubjectsSection({ onSubjectClick }: SubjectsSectionProps) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            Выберите предмет
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Предметы для подготовки
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
