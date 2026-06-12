/**
 * Единый премиум-заголовок внутренних страниц: мягкая аврора + тонкая сетка,
 * градиентная плитка с иконкой, сбалансированный заголовок и подзаголовок,
 * опциональный слот действий справа. Держит визуальный язык всего сайта.
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  /** tailwind-градиент плитки, например 'from-primary to-violet-600' */
  accent?: string;
  /** слот справа (кнопки/фильтры) */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  accent = 'from-primary to-violet-600',
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`relative overflow-hidden rounded-3xl border bg-card/60 mb-8 ${className}`}
    >
      <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-primary/15 blur-[70px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-faint pointer-events-none" />
      <div className="relative px-6 py-7 md:px-9 md:py-9 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} shadow-lg shadow-primary/20 flex items-center justify-center shrink-0`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </motion.div>
  );
}
