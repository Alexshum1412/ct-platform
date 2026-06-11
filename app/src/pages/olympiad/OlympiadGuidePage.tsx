/**
 * «Как готовиться» — редакционные рекомендации по подготовке к каждому этапу
 * республиканской олимпиады РБ + общий план работы в разделе.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Compass, Lightbulb, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LEVEL_META, LEVEL_ORDER } from '@/components/olympiad/levels';
import type { OlympiadLevel } from '@/lib/api/client';

const GUIDE: Record<OlympiadLevel, { when: string; what: string; plan: string[]; tips: string }> = {
  SCHOOL: {
    when: 'Сентябрь — октябрь',
    what: 'Первый этап проводится в школе. Задания опираются на программу, но требуют сообразительности: нестандартная формулировка важнее сложной техники.',
    plan: [
      'Закройте пробелы школьной программы за прошлые годы — школьный этап часто «ловит» на простом.',
      'Прорешайте задачи школьного уровня из нашего каталога по своему предмету (фильтр «Школьный»).',
      'Учитесь оформлять решение: даже верный ответ без объяснения на олимпиаде теряет баллы.',
      'Решайте 3–4 задачи в неделю в спокойном темпе — стабильность важнее марафонов.',
    ],
    tips: 'На этом этапе побеждает внимательность: перечитывайте условие дважды и проверяйте ответ подстановкой.',
  },
  DISTRICT: {
    when: 'Ноябрь — декабрь',
    what: 'Второй (районный/городской) этап. Появляются классические олимпиадные приёмы: принцип Дирихле, чётность, инварианты, оценки.',
    plan: [
      'Изучите статьи раздела «Теория PRO» своего предмета — это база олимпиадных методов.',
      'Решайте задачи районного уровня; к каждой нерешённой обязательно читайте разбор и возвращайтесь к похожей через неделю.',
      'Тренируйтесь укладываться во время: 4 задачи за 3–4 часа, без телефона и подсказок.',
      'Заведите тетрадь приёмов: одна страница — один метод с двумя примерами.',
    ],
    tips: 'Если задача «не идёт» 20 минут — переключитесь на другую и вернитесь позже: на олимпиаде распределение времени решает не меньше знаний.',
  },
  REGION: {
    when: 'Январь',
    what: 'Третий (областной, для Минска — городской) этап. Конкуренция — сильнейшие школьники области; нужны уверенное владение методами и скорость.',
    plan: [
      'Прорешайте областной уровень каталога целиком по своему предмету, включая архив прошлых сезонов.',
      'Разбирайте решения даже РЕШЁННЫХ задач: сравнивайте свой способ с авторским — часто есть более короткий путь.',
      'Раз в неделю устраивайте «тур»: полный комплект задач этапа на время, с оформлением начисто.',
      'Найдите наставника или кружок: обратная связь по оформлению на этом уровне критична.',
    ],
    tips: 'Областной этап выигрывают те, кто умеет добывать частичные баллы: записывайте продвижения по задаче, даже если решение не закончено.',
  },
  REPUBLIC: {
    when: 'Март — апрель',
    what: 'Заключительный (республиканский) этап. Дипломы дают льготы при поступлении: победители зачисляются в вузы без экзаменов по профилю.',
    plan: [
      'Работайте с задачами республиканского уровня и материалами международных олимпиад своего предмета.',
      'Тренируйте многошаговые задачи: на этом уровне решение — это связка из 2–3 идей, а не один приём.',
      'Изучайте темы сверх программы (для математики — теория чисел и комбинаторика, для физики — оценки и нестандартные модели).',
      'Планируйте режим: сильный сон и отдых перед туром дают больше, чем ночная зубрёжка.',
    ],
    tips: 'Читайте все задачи тура в первые 10 минут и начинайте с той, где видите идею, — не по порядку номеров.',
  },
};

export function OlympiadGuidePage() {
  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm"><Link to="/olympiad"><ArrowLeft className="w-4 h-4 mr-1" />Олимпиады</Link></Button>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" /> Как готовиться к олимпиадам
        </h1>
      </div>

      <Card>
        <CardContent className="p-5 text-sm md:text-base text-muted-foreground space-y-2">
          <p>
            Республиканская олимпиада по учебным предметам проходит в четыре этапа: школьный → районный (городской) →
            областной → заключительный республиканский. На каждый следующий этап проходят лучшие участники предыдущего.
          </p>
          <p>
            Победители заключительного этапа получают льготы при поступлении в вузы Беларуси, а сама подготовка
            развивает мышление, которое помогает и на ЦТ/ЦЭ.
          </p>
        </CardContent>
      </Card>

      {LEVEL_ORDER.map(level => {
        const meta = LEVEL_META[level];
        const g = GUIDE[level];
        return (
          <Card key={level} className={`border ${meta.bg}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg flex items-center gap-2 ${meta.color}`}>
                <Target className="w-5 h-5" /> {meta.label}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {g.when} · {meta.points} очков за задачу в разделе</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{g.what}</p>
              <ul className="space-y-1.5 text-sm">
                {g.plan.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary font-bold shrink-0">{i + 1}.</span>{p}</li>
                ))}
              </ul>
              <p className="text-sm rounded-lg bg-background/60 border px-3 py-2 flex gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> {g.tips}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to={`/olympiad/tasks?level=${level}`}>Задачи этого этапа</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary shrink-0" />
          <p className="text-sm flex-1">Методы и приёмы для всех этапов собраны в «Теории PRO» — от принципа Дирихле до окислительно-восстановительных реакций.</p>
          <Button asChild><Link to="/olympiad/theory">Открыть теорию</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
