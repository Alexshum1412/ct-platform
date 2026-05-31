import { motion } from 'framer-motion';
import { Search, BookOpen, Target, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Выберите предмет',
    description: 'Выберите предмет, к которому хотите подготовиться. У нас есть все основные предметы для ЦТ и ЦЭ.',
  },
  {
    number: '02',
    icon: BookOpen,
    title: 'Изучите теорию',
    description: 'Ознакомьтесь с правилами, формулами и примерами решения заданий каждого типа.',
  },
  {
    number: '03',
    icon: Target,
    title: 'Практикуйтесь',
    description: 'Решайте задания по типам или проходите полные варианты экзамена с таймером.',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Анализируйте прогресс',
    description: 'Отслеживайте свою статистику, работайте над ошибками и улучшайте результаты.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Как это работает
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Четыре простых шага к успешной сдаче экзамена
          </p>
        </motion.div>
        
        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
              
              <div className="relative">
                {/* Number */}
                <span className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">
                  {step.number}
                </span>
                
                {/* Content */}
                <div className="relative pt-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
