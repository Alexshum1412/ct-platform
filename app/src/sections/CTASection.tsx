import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface CTASectionProps {
  onStartLearning?: () => void;
}

export function CTASection({ onStartLearning }: CTASectionProps) {
  const navigate = useNavigate();
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 md:p-16 text-center"
        >
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Начните прямо сейчас
            </motion.div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Готовы начать подготовку?
            </h2>
            
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам учеников, которые уже готовятся к ЦТ и ЦЭ 
              с нашей платформой. Это бесплатно!
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={onStartLearning}
                className="bg-white text-primary hover:bg-white/90 gap-2 text-lg px-8"
              >
                Начать бесплатно
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/contact')}
                className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white gap-2 text-lg px-8"
              >
                Узнать больше
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
