/**
 * Секция «Олимпиадная подготовка» на главной — полноценная витрина раздела
 * (заменила маленькую плавающую карточку в hero). Тёмная панель с авророй,
 * четыре уровня этапов и CTA.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, BookOpen, Medal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LEVELS = [
  { short: 'Школьный', points: 10, color: 'bg-emerald-400' },
  { short: 'Районный', points: 20, color: 'bg-sky-400' },
  { short: 'Областной', points: 35, color: 'bg-violet-400' },
  { short: 'Республиканский', points: 50, color: 'bg-amber-400' },
];

export function OlympiadSection() {
  const navigate = useNavigate();
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl bg-indigo-950 text-white p-8 md:p-14 shadow-2xl"
        >
          {/* Аврора на тёмном (холодная палитра — отличается от премиум-блока) */}
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-sky-500/25 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-28 -right-16 w-[28rem] h-[28rem] rounded-full bg-cyan-500/25 blur-[100px] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse at 30% 40%, black 25%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, black 25%, transparent 75%)',
            }}
          />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            {/* Текст + CTA */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-400/15 border border-sky-400/25 text-sky-300 text-sm font-semibold mb-6">
                <Trophy className="w-4 h-4" />
                Олимпиадная подготовка
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] leading-tight font-extrabold mb-4">
                От школьного этапа —{' '}
                <span className="bg-gradient-to-r from-sky-300 to-cyan-300 bg-clip-text text-transparent">до республики</span>
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-xl">
                Задачи всех этапов республиканской олимпиады с пошаговыми разборами,
                теория повышенного уровня, отдельный рейтинг и достижения.
                Диплом заключительного этапа — это поступление без экзаменов.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate('/olympiad')}
                  className="btn-shine bg-sky-400 text-slate-950 hover:bg-sky-300 gap-2 text-base font-bold px-7 shadow-xl shadow-sky-500/25"
                >
                  <Medal className="w-5 h-5" />
                  Открыть раздел
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/olympiad/guide')}
                  className="border-white/25 bg-white/5 text-white hover:bg-white/12 hover:text-white gap-2 text-base px-7"
                >
                  <BookOpen className="w-5 h-5" />
                  Как готовиться
                </Button>
              </div>
            </div>

            {/* Уровни этапов */}
            <div className="grid grid-cols-2 gap-3">
              {LEVELS.map((l, i) => (
                <motion.div
                  key={l.short}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                  className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm p-5 hover:bg-white/[0.1] hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    <p className="font-bold text-sm">{l.short}</p>
                  </div>
                  <p className="text-white/60 text-xs">этап олимпиады</p>
                  <p className="mt-3 text-cyan-300 font-extrabold text-lg">+{l.points} <span className="text-xs font-semibold text-white/50">очков за задачу</span></p>
                </motion.div>
              ))}
              <div className="col-span-2 flex items-center gap-2 text-white/60 text-sm px-1">
                <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                Решайте задачи, копите очки и поднимайтесь в отдельном рейтинге олимпиадников
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
