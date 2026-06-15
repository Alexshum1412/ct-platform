/**
 * Секция «Новостная лента» на главной — идёт сразу после блока Premium.
 * Похожа по структуре, но ведёт на /news. Холодная sky/indigo палитра.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ArrowRight, Megaphone, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOPICS = [
  { icon: Info, label: 'Полезное об экзаменах', desc: 'разборы формата ЦТ/ЦЭ и советы' },
  { icon: Megaphone, label: 'Новости и слухи', desc: 'что важно знать абитуриенту' },
  { icon: Sparkles, label: 'Обновления сайта', desc: 'новые функции платформы' },
];

export function NewsSection() {
  const navigate = useNavigate();
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/20 p-8 md:p-14 shadow-xl"
        >
          <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-sky-400/15 blur-[90px] pointer-events-none" />
          <div className="absolute inset-0 bg-grid-faint pointer-events-none opacity-50" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-sm font-semibold mb-6">
                <Newspaper className="w-4 h-4" />Новостная лента
              </span>
              <h2 className="text-3xl md:text-4xl leading-tight font-extrabold mb-4">
                Оставайтесь в курсе всех{' '}
                <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">новостей</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl">
                Читайте полезную информацию об экзаменах, свежие новости и обновления сайта
                на нашей новостной ленте — всё самое важное в одном месте.
              </p>
              <Button
                size="lg"
                onClick={() => navigate('/news')}
                className="btn-shine bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white gap-2 text-base font-bold px-7 shadow-lg shadow-sky-500/25"
              >
                <Newspaper className="w-5 h-5" />Открыть ленту
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid gap-3">
              {TOPICS.map((t, i) => (
                <motion.div
                  key={t.label}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 hover:border-sky-400/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default NewsSection;
