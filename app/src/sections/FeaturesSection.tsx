import { motion } from 'framer-motion';
import { 
  Target, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Brain,
  Award,
  Zap,
  BarChart3
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Задания по типам',
    description: 'Практикуйтесь в конкретных типах заданий, чтобы укрепить слабые места',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Clock,
    title: 'Режим экзамена',
    description: 'Проходите полноценные варианты ЦТ с таймером и автопроверкой',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: BookOpen,
    title: 'Подробная теория',
    description: 'Изучайте правила, формулы и законы с примерами и пояснениями',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Brain,
    title: 'Умная адаптация',
    description: 'Система подстраивается под ваш уровень и помогает расти',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: TrendingUp,
    title: 'Статистика прогресса',
    description: 'Отслеживайте свой прогресс и выявляйте темы для повторения',
    color: 'from-red-500 to-rose-500',
  },
  {
    icon: Award,
    title: 'Достижения',
    description: 'Получайте награды за регулярную практику и высокие результаты',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Zap,
    title: 'Быстрая проверка',
    description: 'Мгновенная проверка ответов с подробным объяснением решения',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Анализ ошибок',
    description: 'Повторяйте задания, в которых чаще всего ошибаетесь',
    color: 'from-teal-500 to-cyan-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20">
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
            Почему выбирают нас
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Мы создали платформу, которая делает подготовку к экзаменам 
            эффективной, интересной и результативной
          </p>
        </motion.div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group"
            >
              <div className="relative h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                {/* Icon */}
                <div 
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
