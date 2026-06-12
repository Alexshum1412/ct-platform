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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5">
            <BookOpen className="w-4 h-4" />
            11 предметов ЦТ/ЦЭ
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            С какого предмета{' '}
            <span className="bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent">начнём?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            В каждом предмете — задания обеих частей, теория по программе и пробные варианты.
          </p>
        </motion.div>
        
        {/* Subject Grid */}
        <SubjectGrid onSubjectClick={onSubjectClick} />
      </div>
    </section>
  );
}
