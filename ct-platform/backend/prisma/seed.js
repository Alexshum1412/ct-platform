// Seed file for CT-Platform (Belarus CT/CE exam prep)
// CommonJS format for direct node execution

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function cuid() {
  return crypto.randomBytes(12).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

// Hash password using bcryptjs
async function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 12);
}

const subjectsData = [
  { slug: 'math', name: 'Математика', nameShort: 'Математика', description: 'Алгебра, геометрия, тригонометрия и анализ', icon: 'Calculator', color: 'hsl(263 70% 50%)', gradient: 'gradient-math', order: 1 },
  { slug: 'russian', name: 'Русский язык', nameShort: 'Русский язык', description: 'Орфография, пунктуация, синтаксис и лексика', icon: 'PenTool', color: 'hsl(330 80% 60%)', gradient: 'gradient-russian', order: 2 },
  { slug: 'physics', name: 'Физика', nameShort: 'Физика', description: 'Механика, термодинамика, электродинамика и оптика', icon: 'Atom', color: 'hsl(189 94% 43%)', gradient: 'gradient-physics', order: 3 },
  { slug: 'chemistry', name: 'Химия', nameShort: 'Химия', description: 'Неорганическая, органическая и общая химия', icon: 'FlaskConical', color: 'hsl(160 84% 39%)', gradient: 'gradient-chemistry', order: 4 },
  { slug: 'biology', name: 'Биология', nameShort: 'Биология', description: 'Ботаника, зоология, анатомия и генетика', icon: 'Dna', color: 'hsl(84 81% 44%)', gradient: 'from-lime-500 to-green-600', order: 5 },
  { slug: 'history', name: 'История Беларуси', nameShort: 'История Беларуси', description: 'История Беларуси в контексте всемирной истории', icon: 'Globe', color: 'hsl(24 95% 53%)', gradient: 'from-orange-500 to-amber-600', order: 6 },
  { slug: 'english', name: 'Английский язык', nameShort: 'Английский язык', description: 'Грамматика, лексика, чтение и аудирование', icon: 'Languages', color: 'hsl(239 84% 67%)', gradient: 'from-indigo-500 to-purple-600', order: 7 },
  { slug: 'belarusian', name: 'Белорусский язык', nameShort: 'Белорусский язык', description: 'Арфаграфія, пунктуацыя, сінтаксіс і лексіка', icon: 'BookOpen', color: 'hsl(0 84% 60%)', gradient: 'from-red-500 to-rose-600', order: 8 },
  { slug: 'world-history', name: 'Всемирная история', nameShort: 'Всемирная история', description: 'История древнего мира, средневековья, нового и новейшего времени', icon: 'Scroll', color: 'hsl(35 90% 55%)', gradient: 'from-amber-500 to-yellow-600', order: 9 },
  { slug: 'social-studies', name: 'Обществоведение', nameShort: 'Обществоведение', description: 'Право, экономика, философия и социология', icon: 'Scale', color: 'hsl(280 70% 50%)', gradient: 'from-purple-500 to-violet-600', order: 10 },
  { slug: 'geography', name: 'География', nameShort: 'География', description: 'Физическая и экономическая география', icon: 'Map', color: 'hsl(145 70% 45%)', gradient: 'from-emerald-500 to-teal-600', order: 11 },
];

const topicsData = {
  math: [
    { name: 'Алгебра и начала анализа', description: 'Функции, уравнения, неравенства', order: 1 },
    { name: 'Геометрия', description: 'Планиметрия и стереометрия', order: 2 },
    { name: 'Тригонометрия', description: 'Тригонометрические функции и уравнения', order: 3 },
    { name: 'Теория чисел', description: 'Делимость, простые числа, НОД/НОК', order: 4 },
    { name: 'Комбинаторика и вероятность', description: 'Перестановки, сочетания, вероятность', order: 5 },
  ],
  russian: [
    { name: 'Орфография', description: 'Правила написания слов', order: 1 },
    { name: 'Пунктуация', description: 'Знаки препинания', order: 2 },
    { name: 'Морфология', description: 'Части речи и их формы', order: 3 },
    { name: 'Синтаксис', description: 'Строение предложений', order: 4 },
    { name: 'Лексика и фразеология', description: 'Значения слов и выражений', order: 5 },
  ],
  physics: [
    { name: 'Механика', description: 'Кинематика, динамика, законы Ньютона', order: 1 },
    { name: 'Термодинамика', description: 'Тепловые процессы, газовые законы', order: 2 },
    { name: 'Электродинамика', description: 'Электрическое поле, ток, магнетизм', order: 3 },
    { name: 'Оптика', description: 'Отражение, преломление, интерференция', order: 4 },
    { name: 'Атомная физика', description: 'Строение атома, радиоактивность', order: 5 },
  ],
  chemistry: [
    { name: 'Строение вещества', description: 'Атомы, молекулы, химические связи', order: 1 },
    { name: 'Неорганическая химия', description: 'Оксиды, кислоты, соли, основания', order: 2 },
    { name: 'Органическая химия', description: 'Углеводороды, спирты, кислоты', order: 3 },
    { name: 'Химические реакции', description: 'Типы реакций, скорость, равновесие', order: 4 },
  ],
  biology: [
    { name: 'Клетка и её строение', description: 'Органеллы, функции клетки', order: 1 },
    { name: 'Генетика', description: 'Наследственность и изменчивость', order: 2 },
    { name: 'Эволюция', description: 'Теория Дарвина, факторы эволюции', order: 3 },
    { name: 'Анатомия человека', description: 'Системы органов', order: 4 },
  ],
  history: [
    { name: 'Древняя история Беларуси', description: 'Первобытное общество и раннее средневековье', order: 1 },
    { name: 'Великое Княжество Литовское', description: 'Беларусь в составе ВКЛ (XIII-XVIII вв.)', order: 2 },
    { name: 'Беларусь в XIX веке', description: 'Восстания, реформы, национальное движение', order: 3 },
    { name: 'Беларусь в XX веке', description: 'БССР, Великая Отечественная война', order: 4 },
    { name: 'Независимая Беларусь', description: 'Суверенная Республика Беларусь', order: 5 },
  ],
  english: [
    { name: 'Grammar', description: 'Tenses, conditionals, modal verbs', order: 1 },
    { name: 'Vocabulary', description: 'Lexical items, word formation', order: 2 },
    { name: 'Reading Comprehension', description: 'Texts and comprehension tasks', order: 3 },
  ],
  belarusian: [
    { name: 'Арфаграфія', description: 'Правілы напісання слоў', order: 1 },
    { name: 'Марфалогія', description: 'Часціны мовы', order: 2 },
    { name: 'Сінтаксіс', description: 'Будова сказаў', order: 3 },
  ],
  'world-history': [
    { name: 'Древний мир', description: 'Первобытное общество, цивилизации Египта и Греции', order: 1 },
    { name: 'Средневековье', description: 'Феодализм, Крестовые походы, Возрождение', order: 2 },
    { name: 'Новое время', description: 'Реформация, революции, колониализм', order: 3 },
    { name: 'Новейшее время', description: 'Мировые войны, деколонизация', order: 4 },
  ],
  'social-studies': [
    { name: 'Государство и право', description: 'Конституция, права человека, правовые нормы', order: 1 },
    { name: 'Экономика', description: 'Рынок, деньги, экономические системы', order: 2 },
    { name: 'Общество', description: 'Социальная структура, культура', order: 3 },
  ],
  geography: [
    { name: 'Физическая география Беларуси', description: 'Рельеф, климат, реки', order: 1 },
    { name: 'Экономическая география', description: 'Хозяйство, промышленность', order: 2 },
    { name: 'Мировая география', description: 'Страны мира, континенты', order: 3 },
  ],
};

// Questions organized by subject and topic
const questionsData = {
  math: {
    'Алгебра и начала анализа': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Решите уравнение: $2x + 6 = 0$',
        options: JSON.stringify([
          { id: 'A', text: '$x = 3$' },
          { id: 'B', text: '$x = -3$' },
          { id: 'C', text: '$x = -6$' },
          { id: 'D', text: '$x = 6$' },
        ]),
        correctAnswer: 'B',
        explanation: 'Из уравнения $2x + 6 = 0$ вычитаем 6: $2x = -6$. Делим на 2: $x = -3$.',
        tags: JSON.stringify(['уравнения', 'алгебра']),
        externalId: 'M-ALG-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Найдите значение выражения: $3^4 - 2^5$',
        options: JSON.stringify([
          { id: 'A', text: '49' },
          { id: 'B', text: '31' },
          { id: 'C', text: '81' },
          { id: 'D', text: '50' },
        ]),
        correctAnswer: 'A',
        explanation: '$3^4 = 81$, $2^5 = 32$. Значит $81 - 32 = 49$.',
        tags: JSON.stringify(['степени', 'вычисления']),
        externalId: 'M-ALG-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Решите неравенство: $x^2 - 5x + 6 > 0$',
        options: JSON.stringify([
          { id: 'A', text: '$x < 2$ или $x > 3$' },
          { id: 'B', text: '$2 < x < 3$' },
          { id: 'C', text: '$x > 3$' },
          { id: 'D', text: '$x < 2$' },
        ]),
        correctAnswer: 'A',
        explanation: 'Корни уравнения $x^2 - 5x + 6 = 0$: $x_1 = 2$, $x_2 = 3$. Парабола ветвями вверх, значит выражение положительно вне корней: $x < 2$ или $x > 3$.',
        tags: JSON.stringify(['неравенства', 'квадратный трёхчлен']),
        externalId: 'M-ALG-003',
      },
      {
        type: 'TEXT_INPUT',
        difficulty: 1,
        content: 'Вычислите: $\\log_2 8$',
        options: null,
        correctAnswer: '3',
        explanation: '$\\log_2 8 = \\log_2 2^3 = 3$, так как $2^3 = 8$.',
        tags: JSON.stringify(['логарифмы']),
        externalId: 'M-ALG-004',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'Найдите область определения функции $f(x) = \\sqrt{x-1} + \\frac{1}{x-3}$',
        options: JSON.stringify([
          { id: 'A', text: '$[1; +\\infty)$' },
          { id: 'B', text: '$[1; 3) \\cup (3; +\\infty)$' },
          { id: 'C', text: '$(1; 3) \\cup (3; +\\infty)$' },
          { id: 'D', text: '$(1; +\\infty)$' },
        ]),
        correctAnswer: 'B',
        explanation: 'Для $\\sqrt{x-1}$: $x \\geq 1$. Для $\\frac{1}{x-3}$: $x \\neq 3$. Пересечение: $x \\geq 1$ и $x \\neq 3$, то есть $[1; 3) \\cup (3; +\\infty)$.',
        tags: JSON.stringify(['функции', 'область определения']),
        externalId: 'M-ALG-005',
      },
    ],
    'Геометрия': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Гипотенуза прямоугольного треугольника равна 10 см, один катет равен 6 см. Найдите другой катет.',
        options: JSON.stringify([
          { id: 'A', text: '4 см' },
          { id: 'B', text: '7 см' },
          { id: 'C', text: '8 см' },
          { id: 'D', text: '16 см' },
        ]),
        correctAnswer: 'C',
        explanation: 'По теореме Пифагора: $a^2 + b^2 = c^2$. $a^2 = 100 - 36 = 64$. $a = 8$ см.',
        tags: JSON.stringify(['теорема Пифагора', 'треугольник']),
        externalId: 'M-GEO-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Площадь квадрата равна 49 см². Найдите его периметр.',
        options: JSON.stringify([
          { id: 'A', text: '14 см' },
          { id: 'B', text: '28 см' },
          { id: 'C', text: '21 см' },
          { id: 'D', text: '56 см' },
        ]),
        correctAnswer: 'B',
        explanation: 'Сторона квадрата: $a = \\sqrt{49} = 7$ см. Периметр: $P = 4a = 28$ см.',
        tags: JSON.stringify(['квадрат', 'площадь', 'периметр']),
        externalId: 'M-GEO-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'В прямоугольном параллелепипеде рёбра равны 3, 4 и 5. Найдите длину диагонали.',
        options: JSON.stringify([
          { id: 'A', text: '$\\sqrt{50}$' },
          { id: 'B', text: '$5\\sqrt{2}$' },
          { id: 'C', text: '$\\sqrt{34}$' },
          { id: 'D', text: '$\\sqrt{41}$' },
        ]),
        correctAnswer: 'A',
        explanation: 'Диагональ параллелепипеда: $d = \\sqrt{a^2 + b^2 + c^2} = \\sqrt{9 + 16 + 25} = \\sqrt{50} = 5\\sqrt{2}$.',
        tags: JSON.stringify(['стереометрия', 'параллелепипед']),
        externalId: 'M-GEO-003',
      },
    ],
    'Тригонометрия': [
      {
        type: 'TEXT_INPUT',
        difficulty: 1,
        content: 'Найдите значение: $\\sin 30°$. Запишите ответ в виде дроби (например: 1/2).',
        options: null,
        correctAnswer: '1/2',
        explanation: '$\\sin 30° = \\frac{1}{2}$ — табличное значение.',
        tags: JSON.stringify(['тригонометрия', 'значения функций']),
        externalId: 'M-TRIG-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Решите уравнение: $2\\sin x = \\sqrt{2}$, $x \\in [0; 2\\pi]$',
        options: JSON.stringify([
          { id: 'A', text: '$x = \\frac{\\pi}{4}$' },
          { id: 'B', text: '$x = \\frac{\\pi}{4}$ и $x = \\frac{3\\pi}{4}$' },
          { id: 'C', text: '$x = \\frac{\\pi}{4}$ и $x = \\frac{5\\pi}{4}$' },
          { id: 'D', text: '$x = \\frac{3\\pi}{4}$' },
        ]),
        correctAnswer: 'B',
        explanation: '$\\sin x = \\frac{\\sqrt{2}}{2}$. На $[0; 2\\pi]$: $x_1 = \\frac{\\pi}{4}$, $x_2 = \\pi - \\frac{\\pi}{4} = \\frac{3\\pi}{4}$.',
        tags: JSON.stringify(['тригонометрические уравнения']),
        externalId: 'M-TRIG-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'Упростите выражение: $\\sin^2 x + \\cos^2 x + 2\\sin x \\cos x$',
        options: JSON.stringify([
          { id: 'A', text: '$1 + \\sin 2x$' },
          { id: 'B', text: '$2$' },
          { id: 'C', text: '$\\sin 2x$' },
          { id: 'D', text: '$1$' },
        ]),
        correctAnswer: 'A',
        explanation: 'Используем основное тождество $\\sin^2 x + \\cos^2 x = 1$ и формулу двойного угла $2\\sin x \\cos x = \\sin 2x$. Получаем $1 + \\sin 2x$.',
        tags: JSON.stringify(['тригонометрические тождества']),
        externalId: 'M-TRIG-003',
      },
    ],
    'Теория чисел': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Найдите наибольший общий делитель чисел 24 и 36.',
        options: JSON.stringify([
          { id: 'A', text: '6' },
          { id: 'B', text: '12' },
          { id: 'C', text: '4' },
          { id: 'D', text: '72' },
        ]),
        correctAnswer: 'B',
        explanation: '$24 = 2^3 \\cdot 3$, $36 = 2^2 \\cdot 3^2$. НОД $= 2^2 \\cdot 3 = 12$.',
        tags: JSON.stringify(['НОД', 'делимость']),
        externalId: 'M-NUM-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Сколько простых чисел меньше 20?',
        options: JSON.stringify([
          { id: 'A', text: '7' },
          { id: 'B', text: '8' },
          { id: 'C', text: '9' },
          { id: 'D', text: '6' },
        ]),
        correctAnswer: 'B',
        explanation: 'Простые числа до 20: 2, 3, 5, 7, 11, 13, 17, 19. Итого: 8 чисел.',
        tags: JSON.stringify(['простые числа']),
        externalId: 'M-NUM-002',
      },
      {
        type: 'TEXT_INPUT',
        difficulty: 1,
        content: 'Найдите НОК чисел 4 и 6.',
        options: null,
        correctAnswer: '12',
        explanation: '$4 = 2^2$, $6 = 2 \\cdot 3$. НОК $= 2^2 \\cdot 3 = 12$.',
        tags: JSON.stringify(['НОК']),
        externalId: 'M-NUM-003',
      },
    ],
    'Комбинаторика и вероятность': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Из 5 студентов нужно выбрать 2 для участия в конференции. Сколько способов существует?',
        options: JSON.stringify([
          { id: 'A', text: '10' },
          { id: 'B', text: '20' },
          { id: 'C', text: '5' },
          { id: 'D', text: '25' },
        ]),
        correctAnswer: 'A',
        explanation: '$C_5^2 = \\frac{5!}{2! \\cdot 3!} = \\frac{20}{2} = 10$ способов.',
        tags: JSON.stringify(['комбинаторика', 'сочетания']),
        externalId: 'M-COMB-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В урне 3 белых и 7 чёрных шара. Какова вероятность вытащить белый шар?',
        options: JSON.stringify([
          { id: 'A', text: '0.3' },
          { id: 'B', text: '0.7' },
          { id: 'C', text: '0.5' },
          { id: 'D', text: '0.4' },
        ]),
        correctAnswer: 'A',
        explanation: 'Всего шаров: $3 + 7 = 10$. Вероятность: $P = \\frac{3}{10} = 0.3$.',
        tags: JSON.stringify(['вероятность']),
        externalId: 'M-COMB-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'Сколькими способами можно расставить 4 книги на полке?',
        options: JSON.stringify([
          { id: 'A', text: '4' },
          { id: 'B', text: '12' },
          { id: 'C', text: '24' },
          { id: 'D', text: '16' },
        ]),
        correctAnswer: 'C',
        explanation: '$P_4 = 4! = 24$ — число перестановок из 4 элементов.',
        tags: JSON.stringify(['перестановки']),
        externalId: 'M-COMB-003',
      },
    ],
  },

  russian: {
    'Орфография': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Выберите правильное написание слова:',
        options: JSON.stringify([
          { id: 'A', text: 'прИближение' },
          { id: 'B', text: 'прЕближение' },
          { id: 'C', text: 'приближение' },
          { id: 'D', text: 'прыближение' },
        ]),
        correctAnswer: 'C',
        explanation: 'Слово «приближение» — приставка «при-» имеет значение приближения.',
        tags: JSON.stringify(['приставки', 'пре/при']),
        externalId: 'R-ORTH-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В каком слове допущена ошибка в написании окончания?',
        options: JSON.stringify([
          { id: 'A', text: 'о летящей птице' },
          { id: 'B', text: 'у синего моря' },
          { id: 'C', text: 'в горячим чае' },
          { id: 'D', text: 'под старым дубом' },
        ]),
        correctAnswer: 'C',
        explanation: 'Правильно: «в горячем чае» — прилагательное в предложном падеже мужского рода имеет окончание «-ом/-ем».',
        tags: JSON.stringify(['падежные окончания', 'прилагательные']),
        externalId: 'R-ORTH-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Укажите слово с непроверяемой безударной гласной в корне:',
        options: JSON.stringify([
          { id: 'A', text: 'вОда' },
          { id: 'B', text: 'кОрабль' },
          { id: 'C', text: 'зЕлёный' },
          { id: 'D', text: 'сМотреть' },
        ]),
        correctAnswer: 'B',
        explanation: '«Корабль» — словарное слово с непроверяемой безударной гласной «о». «Вода» — проверяется «воды».',
        tags: JSON.stringify(['словарные слова', 'безударная гласная']),
        externalId: 'R-ORTH-003',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Укажите строку, в которой все слова пишутся через дефис:',
        options: JSON.stringify([
          { id: 'A', text: 'пол/лимона, по/русски, кто/либо' },
          { id: 'B', text: 'пол/Минска, по/русски, кто/нибудь' },
          { id: 'C', text: 'пол/лимона, по/русски, что/то' },
          { id: 'D', text: 'пол/Минска, по/белорусски, что/нибудь' },
        ]),
        correctAnswer: 'D',
        explanation: 'Пол-Минска (перед именем собственным), по-белорусски (наречие), что-нибудь (неопределённое местоимение).',
        tags: JSON.stringify(['дефис', 'правописание']),
        externalId: 'R-ORTH-004',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'В каком ряду во всех словах пишется НН?',
        options: JSON.stringify([
          { id: 'A', text: 'деревя(нн)ый, пусты(нн)ый, румя(нн)ый' },
          { id: 'B', text: 'оловя(нн)ый, серебря(нн)ый, ветре(нн)ый' },
          { id: 'C', text: 'стекля(нн)ый, лебеди(нн)ый, кова(нн)ый' },
          { id: 'D', text: 'оловя(нн)ый, деревя(нн)ый, стекля(нн)ый' },
        ]),
        correctAnswer: 'D',
        explanation: 'Оловянный, деревянный, стеклянный — исключения, пишутся с НН. Серебряный, ветреный — с одной Н.',
        tags: JSON.stringify(['н/нн в прилагательных']),
        externalId: 'R-ORTH-005',
      },
    ],
    'Пунктуация': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Укажите предложение, в котором нужно поставить запятую:',
        options: JSON.stringify([
          { id: 'A', text: 'Он пошёл домой и лёг спать.' },
          { id: 'B', text: 'Ветер дул сильно холодало.' },
          { id: 'C', text: 'Дождь закончился и вышло солнце.' },
          { id: 'D', text: 'Небо было ясным.' },
        ]),
        correctAnswer: 'C',
        explanation: 'В сложносочинённом предложении «Дождь закончился, и вышло солнце» перед союзом «и» ставится запятая, так как это два отдельных предложения.',
        tags: JSON.stringify(['запятая', 'ССП']),
        externalId: 'R-PUNCT-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В каком предложении обособляется определение?',
        options: JSON.stringify([
          { id: 'A', text: 'Облака белые плыли по небу.' },
          { id: 'B', text: 'Уставший от дороги путник прилёг отдохнуть.' },
          { id: 'C', text: 'Высокий дуб рос у дороги.' },
          { id: 'D', text: 'Зелёная трава покрывала поляну.' },
        ]),
        correctAnswer: 'B',
        explanation: '«Уставший от дороги» — причастный оборот, стоящий перед определяемым словом, обособляется: «Уставший от дороги, путник прилёг отдохнуть».',
        tags: JSON.stringify(['обособление', 'причастный оборот']),
        externalId: 'R-PUNCT-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Укажите, в каком предложении стоит двоеточие:',
        options: JSON.stringify([
          { id: 'A', text: 'Лес поле река — всё утопало в снегу.' },
          { id: 'B', text: 'Деревья были сосны берёзы ели.' },
          { id: 'C', text: 'В саду росли разные деревья сосны берёзы ели.' },
          { id: 'D', text: 'Он сделал всё посеял убрал сложил.' },
        ]),
        correctAnswer: 'C',
        explanation: 'После обобщающего слова «деревья» перед перечислением ставится двоеточие: «В саду росли разные деревья: сосны, берёзы, ели».',
        tags: JSON.stringify(['двоеточие', 'обобщающее слово']),
        externalId: 'R-PUNCT-003',
      },
    ],
    'Морфология': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'К какой части речи относится слово «бегущий»?',
        options: JSON.stringify([
          { id: 'A', text: 'Глагол' },
          { id: 'B', text: 'Деепричастие' },
          { id: 'C', text: 'Причастие' },
          { id: 'D', text: 'Прилагательное' },
        ]),
        correctAnswer: 'C',
        explanation: '«Бегущий» — причастие, образованное от глагола «бежать» с помощью суффикса -ущ-.',
        tags: JSON.stringify(['морфология', 'причастие']),
        externalId: 'R-MORPH-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В каком ряду все слова являются наречиями?',
        options: JSON.stringify([
          { id: 'A', text: 'быстро, далеко, тихо' },
          { id: 'B', text: 'весёлый, тихо, далеко' },
          { id: 'C', text: 'говорить, молчать, идти' },
          { id: 'D', text: 'красивый, умный, добрый' },
        ]),
        correctAnswer: 'A',
        explanation: 'Быстро, далеко, тихо — все обозначают признак действия и не изменяются, значит это наречия.',
        tags: JSON.stringify(['наречие', 'части речи']),
        externalId: 'R-MORPH-002',
      },
    ],
    'Синтаксис': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Укажите тип предложения: «Когда пришла весна, зазеленели деревья».',
        options: JSON.stringify([
          { id: 'A', text: 'Простое осложнённое' },
          { id: 'B', text: 'Сложносочинённое' },
          { id: 'C', text: 'Сложноподчинённое' },
          { id: 'D', text: 'Бессоюзное сложное' },
        ]),
        correctAnswer: 'C',
        explanation: 'Предложение состоит из главного «зазеленели деревья» и придаточного «когда пришла весна», связанных подчинительным союзом «когда» — это СПП.',
        tags: JSON.stringify(['виды предложений', 'СПП']),
        externalId: 'R-SYNT-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Что является грамматической основой предложения «Студент сдал экзамен успешно»?',
        options: JSON.stringify([
          { id: 'A', text: 'студент сдал' },
          { id: 'B', text: 'сдал экзамен' },
          { id: 'C', text: 'студент успешно' },
          { id: 'D', text: 'экзамен успешно' },
        ]),
        correctAnswer: 'A',
        explanation: 'Грамматическая основа — подлежащее «студент» + сказуемое «сдал». «Экзамен» — дополнение, «успешно» — обстоятельство.',
        tags: JSON.stringify(['грамматическая основа']),
        externalId: 'R-SYNT-002',
      },
    ],
    'Лексика и фразеология': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Что означает фразеологизм «бить баклуши»?',
        options: JSON.stringify([
          { id: 'A', text: 'Бездельничать' },
          { id: 'B', text: 'Усердно работать' },
          { id: 'C', text: 'Громко говорить' },
          { id: 'D', text: 'Быстро бежать' },
        ]),
        correctAnswer: 'A',
        explanation: 'Фразеологизм «бить баклуши» означает бездельничать, ничего не делать. Баклуши — деревянные чурбаки, обработка которых считалась лёгким делом.',
        tags: JSON.stringify(['фразеологизмы']),
        externalId: 'R-LEX-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Укажите пару синонимов:',
        options: JSON.stringify([
          { id: 'A', text: 'смелый — трусливый' },
          { id: 'B', text: 'быстрый — стремительный' },
          { id: 'C', text: 'холодный — горячий' },
          { id: 'D', text: 'большой — маленький' },
        ]),
        correctAnswer: 'B',
        explanation: '«Быстрый» и «стремительный» — синонимы (близкие по значению). Остальные пары — антонимы.',
        tags: JSON.stringify(['синонимы', 'лексика']),
        externalId: 'R-LEX-002',
      },
    ],
  },

  physics: {
    'Механика': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Тело движется равномерно со скоростью 10 м/с. Какое расстояние оно пройдёт за 5 секунд?',
        options: JSON.stringify([
          { id: 'A', text: '2 м' },
          { id: 'B', text: '50 м' },
          { id: 'C', text: '15 м' },
          { id: 'D', text: '5 м' },
        ]),
        correctAnswer: 'B',
        explanation: '$s = v \\cdot t = 10 \\cdot 5 = 50$ м.',
        tags: JSON.stringify(['кинематика', 'равномерное движение']),
        externalId: 'PH-MECH-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Чему равна сила, с которой надо действовать на тело массой 2 кг, чтобы придать ему ускорение 5 м/с²?',
        options: JSON.stringify([
          { id: 'A', text: '2.5 Н' },
          { id: 'B', text: '7 Н' },
          { id: 'C', text: '10 Н' },
          { id: 'D', text: '3 Н' },
        ]),
        correctAnswer: 'C',
        explanation: 'По второму закону Ньютона: $F = m \\cdot a = 2 \\cdot 5 = 10$ Н.',
        tags: JSON.stringify(['второй закон Ньютона', 'динамика']),
        externalId: 'PH-MECH-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Тело брошено вертикально вверх со скоростью 20 м/с. Какова максимальная высота подъёма? ($g = 10$ м/с²)',
        options: JSON.stringify([
          { id: 'A', text: '10 м' },
          { id: 'B', text: '40 м' },
          { id: 'C', text: '20 м' },
          { id: 'D', text: '2 м' },
        ]),
        correctAnswer: 'C',
        explanation: '$H = \\frac{v_0^2}{2g} = \\frac{400}{20} = 20$ м.',
        tags: JSON.stringify(['свободное падение', 'кинематика']),
        externalId: 'PH-MECH-003',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Чему равна работа силы 50 Н на пути 10 м в направлении движения?',
        options: JSON.stringify([
          { id: 'A', text: '5 Дж' },
          { id: 'B', text: '60 Дж' },
          { id: 'C', text: '500 Дж' },
          { id: 'D', text: '0.2 Дж' },
        ]),
        correctAnswer: 'C',
        explanation: '$A = F \\cdot s = 50 \\cdot 10 = 500$ Дж.',
        tags: JSON.stringify(['работа', 'энергия']),
        externalId: 'PH-MECH-004',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'На тело действуют силы: $F_1 = 6$ Н (вправо) и $F_2 = 8$ Н (вниз). Найдите равнодействующую.',
        options: JSON.stringify([
          { id: 'A', text: '2 Н' },
          { id: 'B', text: '14 Н' },
          { id: 'C', text: '10 Н' },
          { id: 'D', text: '7 Н' },
        ]),
        correctAnswer: 'C',
        explanation: 'Силы перпендикулярны, поэтому $F = \\sqrt{F_1^2 + F_2^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$ Н.',
        tags: JSON.stringify(['сложение сил', 'векторы']),
        externalId: 'PH-MECH-005',
      },
    ],
    'Термодинамика': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Как изменится объём идеального газа, если при постоянном объёме увеличить температуру в 2 раза?',
        options: JSON.stringify([
          { id: 'A', text: 'Уменьшится в 2 раза' },
          { id: 'B', text: 'Увеличится в 2 раза' },
          { id: 'C', text: 'Не изменится' },
          { id: 'D', text: 'Увеличится в 4 раза' },
        ]),
        correctAnswer: 'C',
        explanation: 'Условие изохорного процесса — объём постоянный. Если объём не меняется, то при увеличении температуры в 2 раза давление увеличится в 2 раза.',
        tags: JSON.stringify(['изохорный процесс', 'газовые законы']),
        externalId: 'PH-THERM-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В изотермическом процессе объём газа уменьшился в 3 раза. Как изменилось давление?',
        options: JSON.stringify([
          { id: 'A', text: 'Уменьшилось в 3 раза' },
          { id: 'B', text: 'Увеличилось в 3 раза' },
          { id: 'C', text: 'Не изменилось' },
          { id: 'D', text: 'Увеличилось в 9 раз' },
        ]),
        correctAnswer: 'B',
        explanation: 'По закону Бойля-Мариотта: $p_1 V_1 = p_2 V_2$. Если $V_2 = V_1/3$, то $p_2 = 3p_1$ — давление увеличилось в 3 раза.',
        tags: JSON.stringify(['закон Бойля-Мариотта', 'изотермный процесс']),
        externalId: 'PH-THERM-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Чему равно количество теплоты, необходимое для нагревания 2 кг воды от 20°C до 70°C? (удельная теплоёмкость воды 4200 Дж/(кг·°C))',
        options: JSON.stringify([
          { id: 'A', text: '84000 Дж' },
          { id: 'B', text: '420000 Дж' },
          { id: 'C', text: '168000 Дж' },
          { id: 'D', text: '42000 Дж' },
        ]),
        correctAnswer: 'B',
        explanation: '$Q = cm\\Delta T = 4200 \\cdot 2 \\cdot 50 = 420000$ Дж.',
        tags: JSON.stringify(['количество теплоты', 'теплоёмкость']),
        externalId: 'PH-THERM-003',
      },
    ],
    'Электродинамика': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Чему равна сила тока в цепи, если напряжение 12 В, а сопротивление 4 Ом?',
        options: JSON.stringify([
          { id: 'A', text: '48 А' },
          { id: 'B', text: '3 А' },
          { id: 'C', text: '0.33 А' },
          { id: 'D', text: '8 А' },
        ]),
        correctAnswer: 'B',
        explanation: 'По закону Ома: $I = \\frac{U}{R} = \\frac{12}{4} = 3$ А.',
        tags: JSON.stringify(['закон Ома', 'электрический ток']),
        externalId: 'PH-ELEC-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Два резистора $R_1 = 4$ Ом и $R_2 = 6$ Ом соединены параллельно. Найдите их общее сопротивление.',
        options: JSON.stringify([
          { id: 'A', text: '10 Ом' },
          { id: 'B', text: '2.4 Ом' },
          { id: 'C', text: '5 Ом' },
          { id: 'D', text: '1.5 Ом' },
        ]),
        correctAnswer: 'B',
        explanation: '$\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2} = \\frac{1}{4} + \\frac{1}{6} = \\frac{5}{12}$. Значит $R = \\frac{12}{5} = 2.4$ Ом.',
        tags: JSON.stringify(['параллельное соединение', 'сопротивление']),
        externalId: 'PH-ELEC-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Чему равна мощность лампы, если сила тока 2 А и напряжение 110 В?',
        options: JSON.stringify([
          { id: 'A', text: '55 Вт' },
          { id: 'B', text: '112 Вт' },
          { id: 'C', text: '220 Вт' },
          { id: 'D', text: '108 Вт' },
        ]),
        correctAnswer: 'C',
        explanation: '$P = UI = 110 \\cdot 2 = 220$ Вт.',
        tags: JSON.stringify(['мощность электрического тока']),
        externalId: 'PH-ELEC-003',
      },
    ],
    'Оптика': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Угол падения луча равен 30°. Чему равен угол отражения?',
        options: JSON.stringify([
          { id: 'A', text: '60°' },
          { id: 'B', text: '30°' },
          { id: 'C', text: '90°' },
          { id: 'D', text: '45°' },
        ]),
        correctAnswer: 'B',
        explanation: 'По закону отражения угол падения равен углу отражения: $\\alpha = \\beta = 30°$.',
        tags: JSON.stringify(['закон отражения', 'оптика']),
        externalId: 'PH-OPT-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Предмет находится на расстоянии 40 см от собирающей линзы с фокусным расстоянием 20 см. На каком расстоянии от линзы получится изображение?',
        options: JSON.stringify([
          { id: 'A', text: '40 см' },
          { id: 'B', text: '20 см' },
          { id: 'C', text: '10 см' },
          { id: 'D', text: '60 см' },
        ]),
        correctAnswer: 'A',
        explanation: 'Формула линзы: $\\frac{1}{f} = \\frac{1}{d} + \\frac{1}{v}$. $\\frac{1}{20} = \\frac{1}{40} + \\frac{1}{v}$. $\\frac{1}{v} = \\frac{1}{20} - \\frac{1}{40} = \\frac{1}{40}$. $v = 40$ см.',
        tags: JSON.stringify(['формула линзы', 'изображение']),
        externalId: 'PH-OPT-002',
      },
    ],
    'Атомная физика': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Какой заряд имеет протон?',
        options: JSON.stringify([
          { id: 'A', text: 'Отрицательный' },
          { id: 'B', text: 'Нейтральный' },
          { id: 'C', text: 'Положительный' },
          { id: 'D', text: 'Переменный' },
        ]),
        correctAnswer: 'C',
        explanation: 'Протон имеет положительный заряд, равный элементарному заряду $e = 1.6 \\cdot 10^{-19}$ Кл.',
        tags: JSON.stringify(['строение атома', 'частицы']),
        externalId: 'PH-ATOM-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Период полураспада радиоактивного вещества 4 дня. Сколько останется от 80 г через 12 дней?',
        options: JSON.stringify([
          { id: 'A', text: '40 г' },
          { id: 'B', text: '20 г' },
          { id: 'C', text: '10 г' },
          { id: 'D', text: '5 г' },
        ]),
        correctAnswer: 'C',
        explanation: 'За 12 дней проходит 3 периода полураспада: $80 \\to 40 \\to 20 \\to 10$ г.',
        tags: JSON.stringify(['радиоактивность', 'период полураспада']),
        externalId: 'PH-ATOM-002',
      },
    ],
  },

  chemistry: {
    'Строение вещества': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Сколько электронов на внешнем энергетическом уровне атома кислорода (O, Z=8)?',
        options: JSON.stringify([
          { id: 'A', text: '2' },
          { id: 'B', text: '6' },
          { id: 'C', text: '8' },
          { id: 'D', text: '4' },
        ]),
        correctAnswer: 'B',
        explanation: 'Электронная конфигурация кислорода: $1s^2 2s^2 2p^4$. На внешнем (втором) уровне: $2s^2 2p^4 = 6$ электронов.',
        tags: JSON.stringify(['строение атома', 'электронные конфигурации']),
        externalId: 'CH-STRUCT-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Какой тип химической связи характерен для молекулы $H_2O$?',
        options: JSON.stringify([
          { id: 'A', text: 'Ионная' },
          { id: 'B', text: 'Ковалентная полярная' },
          { id: 'C', text: 'Ковалентная неполярная' },
          { id: 'D', text: 'Металлическая' },
        ]),
        correctAnswer: 'B',
        explanation: 'В молекуле воды между атомами O и H образуется ковалентная полярная связь — общие электроны смещены в сторону более электроотрицательного кислорода.',
        tags: JSON.stringify(['химическая связь', 'полярность']),
        externalId: 'CH-STRUCT-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'В каком ряду все вещества имеют ионное строение?',
        options: JSON.stringify([
          { id: 'A', text: '$NaCl$, $KOH$, $CaCO_3$' },
          { id: 'B', text: '$H_2O$, $NaCl$, $HCl$' },
          { id: 'C', text: '$O_2$, $N_2$, $Cl_2$' },
          { id: 'D', text: '$H_2SO_4$, $HNO_3$, $H_3PO_4$' },
        ]),
        correctAnswer: 'A',
        explanation: 'Ионные вещества — соли и основания металлов: $NaCl$, $KOH$, $CaCO_3$. Вода, $HCl$, $H_2SO_4$ имеют ковалентную полярную связь.',
        tags: JSON.stringify(['ионная связь', 'типы веществ']),
        externalId: 'CH-STRUCT-003',
      },
    ],
    'Неорганическая химия': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Как называется реакция $2H_2 + O_2 \\to 2H_2O$?',
        options: JSON.stringify([
          { id: 'A', text: 'Реакция разложения' },
          { id: 'B', text: 'Реакция замещения' },
          { id: 'C', text: 'Реакция соединения' },
          { id: 'D', text: 'Реакция обмена' },
        ]),
        correctAnswer: 'C',
        explanation: 'Из двух простых веществ образуется одно сложное — это реакция соединения (синтез).',
        tags: JSON.stringify(['типы реакций', 'неорганическая химия']),
        externalId: 'CH-INORG-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Укажите формулу серной кислоты:',
        options: JSON.stringify([
          { id: 'A', text: '$HNO_3$' },
          { id: 'B', text: '$HCl$' },
          { id: 'C', text: '$H_2SO_4$' },
          { id: 'D', text: '$H_3PO_4$' },
        ]),
        correctAnswer: 'C',
        explanation: 'Серная кислота — $H_2SO_4$. Азотная — $HNO_3$, соляная — $HCl$, фосфорная — $H_3PO_4$.',
        tags: JSON.stringify(['кислоты', 'формулы']),
        externalId: 'CH-INORG-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В реакции $Fe + 2HCl \\to FeCl_2 + H_2$ железо является:',
        options: JSON.stringify([
          { id: 'A', text: 'Кислотой' },
          { id: 'B', text: 'Окислителем' },
          { id: 'C', text: 'Восстановителем' },
          { id: 'D', text: 'Катализатором' },
        ]),
        correctAnswer: 'C',
        explanation: 'Железо отдаёт электроны (степень окисления изменяется с 0 до +2), поэтому оно является восстановителем.',
        tags: JSON.stringify(['окислительно-восстановительные реакции']),
        externalId: 'CH-INORG-003',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Какой из перечисленных металлов самый активный?',
        options: JSON.stringify([
          { id: 'A', text: 'Медь' },
          { id: 'B', text: 'Золото' },
          { id: 'C', text: 'Калий' },
          { id: 'D', text: 'Железо' },
        ]),
        correctAnswer: 'C',
        explanation: 'Калий находится в начале ряда активности металлов и является одним из самых активных металлов.',
        tags: JSON.stringify(['активность металлов', 'ряд активности']),
        externalId: 'CH-INORG-004',
      },
    ],
    'Органическая химия': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Какова общая формула алканов?',
        options: JSON.stringify([
          { id: 'A', text: '$C_nH_{2n}$' },
          { id: 'B', text: '$C_nH_{2n-2}$' },
          { id: 'C', text: '$C_nH_{2n+2}$' },
          { id: 'D', text: '$C_nH_{2n+1}$' },
        ]),
        correctAnswer: 'C',
        explanation: 'Алканы (насыщенные углеводороды) имеют общую формулу $C_nH_{2n+2}$. Например, метан $CH_4$, этан $C_2H_6$.',
        tags: JSON.stringify(['алканы', 'углеводороды']),
        externalId: 'CH-ORG-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Что образуется при реакции этанола с натрием?',
        options: JSON.stringify([
          { id: 'A', text: 'Этилат натрия и водород' },
          { id: 'B', text: 'Уксусная кислота и вода' },
          { id: 'C', text: 'Натриевое мыло и глицерин' },
          { id: 'D', text: 'Хлорэтан и оксид натрия' },
        ]),
        correctAnswer: 'A',
        explanation: '$2C_2H_5OH + 2Na \\to 2C_2H_5ONa + H_2\\uparrow$. Спирт с активным металлом даёт алкоголят металла и водород.',
        tags: JSON.stringify(['спирты', 'реакции этанола']),
        externalId: 'CH-ORG-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'Укажите тип реакции: $CH_2=CH_2 + H_2 \\to CH_3-CH_3$',
        options: JSON.stringify([
          { id: 'A', text: 'Реакция замещения' },
          { id: 'B', text: 'Реакция присоединения (гидрирование)' },
          { id: 'C', text: 'Реакция отщепления' },
          { id: 'D', text: 'Реакция горения' },
        ]),
        correctAnswer: 'B',
        explanation: 'К двойной связи этилена присоединяется водород с образованием этана — это реакция присоединения (гидрирования).',
        tags: JSON.stringify(['алкены', 'реакции присоединения']),
        externalId: 'CH-ORG-003',
      },
    ],
    'Химические реакции': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Расставьте коэффициенты в схеме: $Fe_2O_3 + H_2 \\to Fe + H_2O$',
        options: JSON.stringify([
          { id: 'A', text: '$1, 2, 2, 2$' },
          { id: 'B', text: '$1, 3, 2, 3$' },
          { id: 'C', text: '$2, 3, 4, 3$' },
          { id: 'D', text: '$1, 2, 1, 2$' },
        ]),
        correctAnswer: 'B',
        explanation: '$Fe_2O_3 + 3H_2 \\to 2Fe + 3H_2O$. Проверяем: Fe: 2=2 ✓, O: 3=3 ✓, H: 6=6 ✓.',
        tags: JSON.stringify(['расстановка коэффициентов', 'уравнения реакций']),
        externalId: 'CH-REACT-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Что такое катализатор?',
        options: JSON.stringify([
          { id: 'A', text: 'Вещество, расходующееся в реакции' },
          { id: 'B', text: 'Вещество, ускоряющее реакцию, но не расходующееся' },
          { id: 'C', text: 'Продукт химической реакции' },
          { id: 'D', text: 'Вещество, замедляющее реакцию' },
        ]),
        correctAnswer: 'B',
        explanation: 'Катализатор — вещество, ускоряющее химическую реакцию, но не входящее в состав продуктов и не расходующееся в процессе реакции.',
        tags: JSON.stringify(['катализ', 'катализатор']),
        externalId: 'CH-REACT-002',
      },
    ],
  },

  biology: {
    'Клетка и её строение': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Где хранится генетическая информация клетки?',
        options: JSON.stringify([
          { id: 'A', text: 'В митохондриях' },
          { id: 'B', text: 'В ядре' },
          { id: 'C', text: 'В рибосомах' },
          { id: 'D', text: 'В клеточной мембране' },
        ]),
        correctAnswer: 'B',
        explanation: 'Генетическая информация хранится в ядре клетки в виде ДНК, организованной в хромосомы.',
        tags: JSON.stringify(['ядро', 'генетика', 'ДНК']),
        externalId: 'BIO-CELL-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Какая органелла клетки отвечает за синтез белков?',
        options: JSON.stringify([
          { id: 'A', text: 'Митохондрии' },
          { id: 'B', text: 'Хлоропласт' },
          { id: 'C', text: 'Рибосомы' },
          { id: 'D', text: 'Лизосомы' },
        ]),
        correctAnswer: 'C',
        explanation: 'Рибосомы — органеллы, осуществляющие синтез белков (трансляцию).',
        tags: JSON.stringify(['рибосомы', 'синтез белков']),
        externalId: 'BIO-CELL-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Какого органоида нет в клетках животных?',
        options: JSON.stringify([
          { id: 'A', text: 'Митохондрии' },
          { id: 'B', text: 'Рибосомы' },
          { id: 'C', text: 'Хлоропласты' },
          { id: 'D', text: 'Лизосомы' },
        ]),
        correctAnswer: 'C',
        explanation: 'Хлоропласты — органеллы фотосинтеза, присутствующие только в клетках растений.',
        tags: JSON.stringify(['клетки растений и животных', 'хлоропласты']),
        externalId: 'BIO-CELL-003',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Что происходит в процессе фотосинтеза?',
        options: JSON.stringify([
          { id: 'A', text: 'Органические вещества расщепляются до CO₂ и H₂O' },
          { id: 'B', text: 'Из CO₂ и H₂O синтезируется глюкоза' },
          { id: 'C', text: 'Синтезируется АТФ за счёт дыхания' },
          { id: 'D', text: 'Белки расщепляются на аминокислоты' },
        ]),
        correctAnswer: 'B',
        explanation: 'Фотосинтез: $6CO_2 + 6H_2O \\xrightarrow{hv} C_6H_{12}O_6 + 6O_2$. Из углекислого газа и воды с использованием энергии света синтезируется глюкоза.',
        tags: JSON.stringify(['фотосинтез', 'хлоропласты']),
        externalId: 'BIO-CELL-004',
      },
    ],
    'Генетика': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Какой закон Менделя гласит: «При скрещивании двух гомозиготных организмов, отличающихся по одной паре признаков, потомство первого поколения единообразно»?',
        options: JSON.stringify([
          { id: 'A', text: 'Второй закон Менделя' },
          { id: 'B', text: 'Третий закон Менделя' },
          { id: 'C', text: 'Первый закон Менделя' },
          { id: 'D', text: 'Закон Харди-Вайнберга' },
        ]),
        correctAnswer: 'C',
        explanation: 'Первый закон Менделя (закон единообразия гибридов первого поколения) устанавливает единообразие потомства при скрещивании чистых линий.',
        tags: JSON.stringify(['законы Менделя', 'наследственность']),
        externalId: 'BIO-GEN-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'В клетках человека содержится 46 хромосом. Сколько хромосом в яйцеклетке?',
        options: JSON.stringify([
          { id: 'A', text: '92' },
          { id: 'B', text: '46' },
          { id: 'C', text: '23' },
          { id: 'D', text: '24' },
        ]),
        correctAnswer: 'C',
        explanation: 'Половые клетки (гаметы) гаплоидны — содержат половинный набор хромосом: $46/2 = 23$ хромосомы.',
        tags: JSON.stringify(['хромосомы', 'гаметы', 'мейоз']),
        externalId: 'BIO-GEN-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 3,
        content: 'У гетерозиготного чёрного кролика (Aa) и белого кролика (aa) родились крольчата. Каков процент чёрных крольчат?',
        options: JSON.stringify([
          { id: 'A', text: '75%' },
          { id: 'B', text: '25%' },
          { id: 'C', text: '100%' },
          { id: 'D', text: '50%' },
        ]),
        correctAnswer: 'D',
        explanation: 'Схема скрещивания: $Aa \\times aa$. Потомство: $Aa$ (чёрный) и $aa$ (белый) в соотношении 1:1. Значит 50% чёрных.',
        tags: JSON.stringify(['моногибридное скрещивание', 'генотип']),
        externalId: 'BIO-GEN-003',
      },
    ],
    'Эволюция': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Кто является автором теории эволюции путём естественного отбора?',
        options: JSON.stringify([
          { id: 'A', text: 'Ламарк' },
          { id: 'B', text: 'Дарвин' },
          { id: 'C', text: 'Вавилов' },
          { id: 'D', text: 'Мендель' },
        ]),
        correctAnswer: 'B',
        explanation: 'Чарльз Дарвин создал теорию эволюции путём естественного отбора, изложенную в книге «Происхождение видов» (1859).',
        tags: JSON.stringify(['Дарвин', 'теория эволюции']),
        externalId: 'BIO-EVOL-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Что является движущей силой эволюции по Дарвину?',
        options: JSON.stringify([
          { id: 'A', text: 'Упражнение органов' },
          { id: 'B', text: 'Наследственная изменчивость и естественный отбор' },
          { id: 'C', text: 'Стремление организмов к совершенству' },
          { id: 'D', text: 'Мутации только' },
        ]),
        correctAnswer: 'B',
        explanation: 'Движущие силы эволюции по Дарвину: наследственная изменчивость, борьба за существование и естественный отбор.',
        tags: JSON.stringify(['естественный отбор', 'движущие силы эволюции']),
        externalId: 'BIO-EVOL-002',
      },
    ],
    'Анатомия человека': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Какой орган является центральным в кровеносной системе человека?',
        options: JSON.stringify([
          { id: 'A', text: 'Лёгкие' },
          { id: 'B', text: 'Сердце' },
          { id: 'C', text: 'Почки' },
          { id: 'D', text: 'Печень' },
        ]),
        correctAnswer: 'B',
        explanation: 'Сердце — главный орган кровеносной системы, обеспечивающий движение крови по кровеносным сосудам.',
        tags: JSON.stringify(['кровеносная система', 'сердце']),
        externalId: 'BIO-ANAT-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Где осуществляется газообмен в организме человека?',
        options: JSON.stringify([
          { id: 'A', text: 'В трахее' },
          { id: 'B', text: 'В альвеолах лёгких' },
          { id: 'C', text: 'В бронхах' },
          { id: 'D', text: 'В носовой полости' },
        ]),
        correctAnswer: 'B',
        explanation: 'Газообмен происходит в альвеолах лёгких — кислород поступает в кровь, а углекислый газ выводится наружу.',
        tags: JSON.stringify(['дыхательная система', 'альвеолы']),
        externalId: 'BIO-ANAT-002',
      },
    ],
  },

  history: {
    'Великое Княжество Литовское': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'В каком году была подписана Кревская уния, объединившая ВКЛ и Польское королевство?',
        options: JSON.stringify([
          { id: 'A', text: '1385' },
          { id: 'B', text: '1410' },
          { id: 'C', text: '1569' },
          { id: 'D', text: '1795' },
        ]),
        correctAnswer: 'A',
        explanation: 'Кревская уния 1385 года — соглашение о браке великого князя литовского Ягайло с польской королевой Ядвигой, ставшее основой польско-литовского союза.',
        tags: JSON.stringify(['ВКЛ', 'уния', 'Ягайло']),
        externalId: 'HIS-GDL-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Что было принято на сейме в Люблине в 1569 году?',
        options: JSON.stringify([
          { id: 'A', text: 'Кревская уния' },
          { id: 'B', text: 'Люблинская уния — образование Речи Посполитой' },
          { id: 'C', text: 'Статут ВКЛ' },
          { id: 'D', text: 'Берестейская уния' },
        ]),
        correctAnswer: 'B',
        explanation: 'Люблинская уния 1569 года объединила ВКЛ и Польское королевство в федеративное государство — Речь Посполитую.',
        tags: JSON.stringify(['Люблинская уния', 'Речь Посполитая']),
        externalId: 'HIS-GDL-002',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'В каком году произошла Грюнвальдская битва?',
        options: JSON.stringify([
          { id: 'A', text: '1387' },
          { id: 'B', text: '1410' },
          { id: 'C', text: '1385' },
          { id: 'D', text: '1452' },
        ]),
        correctAnswer: 'B',
        explanation: 'Грюнвальдская битва (15 июля 1410 года) — победа объединённых войск ВКЛ и Польши над Тевтонским орденом.',
        tags: JSON.stringify(['Грюнвальд', 'Тевтонский орден']),
        externalId: 'HIS-GDL-003',
      },
    ],
    'Беларусь в XIX веке': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Кто возглавил восстание 1863-1864 годов в Беларуси?',
        options: JSON.stringify([
          { id: 'A', text: 'Тадеуш Костюшко' },
          { id: 'B', text: 'Кастусь Калиновский' },
          { id: 'C', text: 'Франциск Скорина' },
          { id: 'D', text: 'Симон Будный' },
        ]),
        correctAnswer: 'B',
        explanation: 'Кастусь Калиновский — руководитель восстания 1863–1864 гг. на территории Беларуси и Литвы, национальный герой белорусского народа.',
        tags: JSON.stringify(['восстание 1863-1864', 'Калиновский']),
        externalId: 'HIS-XIX-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'В состав какого государства вошла Беларусь после разделов Речи Посполитой (конец XVIII в.)?',
        options: JSON.stringify([
          { id: 'A', text: 'Австрийской империи' },
          { id: 'B', text: 'Российской империи' },
          { id: 'C', text: 'Пруссии' },
          { id: 'D', text: 'Наполеоновской Франции' },
        ]),
        correctAnswer: 'B',
        explanation: 'В результате трёх разделов Речи Посполитой (1772, 1793, 1795) белорусские земли вошли в состав Российской империи.',
        tags: JSON.stringify(['разделы Речи Посполитой', 'Российская империя']),
        externalId: 'HIS-XIX-002',
      },
    ],
    'Беларусь в XX веке': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'Когда была провозглашена Белорусская Народная Республика (БНР)?',
        options: JSON.stringify([
          { id: 'A', text: '1 января 1919 года' },
          { id: 'B', text: '25 марта 1918 года' },
          { id: 'C', text: '27 июля 1990 года' },
          { id: 'D', text: '3 июля 1944 года' },
        ]),
        correctAnswer: 'B',
        explanation: 'БНР была провозглашена 25 марта 1918 года — эта дата отмечается как День Воли.',
        tags: JSON.stringify(['БНР', 'Белорусская Народная Республика']),
        externalId: 'HIS-XX-001',
      },
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Когда Беларусь была освобождена от немецко-фашистских захватчиков в ходе операции «Багратион»?',
        options: JSON.stringify([
          { id: 'A', text: '1942' },
          { id: 'B', text: '1943' },
          { id: 'C', text: '1944' },
          { id: 'D', text: '1945' },
        ]),
        correctAnswer: 'C',
        explanation: 'Операция «Багратион» проводилась с 23 июня по 19 августа 1944 года, в результате которой Беларусь была освобождена от оккупации.',
        tags: JSON.stringify(['операция Багратион', 'ВОВ', 'освобождение']),
        externalId: 'HIS-XX-002',
      },
    ],
    'Независимая Беларусь': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 1,
        content: 'В каком году была принята Декларация о государственном суверенитете Республики Беларусь?',
        options: JSON.stringify([
          { id: 'A', text: '1991' },
          { id: 'B', text: '1990' },
          { id: 'C', text: '1994' },
          { id: 'D', text: '1995' },
        ]),
        correctAnswer: 'B',
        explanation: 'Декларация о государственном суверенитете была принята 27 июля 1990 года. День независимости отмечается 3 июля (день освобождения Минска в 1944 году).',
        tags: JSON.stringify(['суверенитет', 'независимость Беларуси']),
        externalId: 'HIS-IND-001',
      },
    ],
    'Древняя история Беларуси': [
      {
        type: 'SINGLE_CHOICE',
        difficulty: 2,
        content: 'Как называлось первое государственное образование на территории Беларуси?',
        options: JSON.stringify([
          { id: 'A', text: 'Полоцкое княжество' },
          { id: 'B', text: 'Великое Княжество Литовское' },
          { id: 'C', text: 'Туровское княжество' },
          { id: 'D', text: 'Смоленское княжество' },
        ]),
        correctAnswer: 'A',
        explanation: 'Полоцкое княжество (IX–XIII вв.) — первое и наиболее значимое раннефеодальное государство на белорусских землях.',
        tags: JSON.stringify(['Полоцкое княжество', 'ранняя история']),
        externalId: 'HIS-ANC-001',
      },
    ],
  },
};

// Theory data
const theoryData = {
  math: {
    'Алгебра и начала анализа': {
      title: 'Основы алгебры: уравнения и неравенства',
      content: `## Линейные уравнения

Линейное уравнение — уравнение вида $ax + b = 0$, где $a \\neq 0$.

**Решение:** $x = -\\frac{b}{a}$

**Пример:** $3x - 9 = 0 \\Rightarrow x = 3$

## Квадратные уравнения

Квадратное уравнение: $ax^2 + bx + c = 0$, $a \\neq 0$

**Дискриминант:** $D = b^2 - 4ac$

- $D > 0$: два различных корня $x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}$
- $D = 0$: один корень $x = -\\frac{b}{2a}$
- $D < 0$: нет вещественных корней

## Степени и логарифмы

**Свойства степеней:**
- $a^m \\cdot a^n = a^{m+n}$
- $(a^m)^n = a^{mn}$
- $a^0 = 1$ (при $a \\neq 0$)

**Логарифм:** $\\log_a b = c \\Leftrightarrow a^c = b$

**Свойства логарифмов:**
- $\\log_a (xy) = \\log_a x + \\log_a y$
- $\\log_a \\frac{x}{y} = \\log_a x - \\log_a y$
- $\\log_a x^n = n \\log_a x$`,
    },
    'Тригонометрия': {
      title: 'Тригонометрические функции',
      content: `## Основные тригонометрические функции

| Угол | $\\sin$ | $\\cos$ | $\\tan$ |
|------|---------|---------|---------|
| $0°$ | $0$ | $1$ | $0$ |
| $30°$ | $\\frac{1}{2}$ | $\\frac{\\sqrt{3}}{2}$ | $\\frac{1}{\\sqrt{3}}$ |
| $45°$ | $\\frac{\\sqrt{2}}{2}$ | $\\frac{\\sqrt{2}}{2}$ | $1$ |
| $60°$ | $\\frac{\\sqrt{3}}{2}$ | $\\frac{1}{2}$ | $\\sqrt{3}$ |
| $90°$ | $1$ | $0$ | — |

## Основные тождества

**Основное тригонометрическое тождество:**
$$\\sin^2 x + \\cos^2 x = 1$$

**Формулы двойного угла:**
$$\\sin 2x = 2\\sin x \\cos x$$
$$\\cos 2x = \\cos^2 x - \\sin^2 x$$

## Решение уравнений

$\\sin x = a \\Rightarrow x = (-1)^n \\arcsin a + \\pi n, n \\in \\mathbb{Z}$

$\\cos x = a \\Rightarrow x = \\pm \\arccos a + 2\\pi n, n \\in \\mathbb{Z}$`,
    },
  },
  russian: {
    'Орфография': {
      title: 'Правила орфографии: приставки и корни',
      content: `## Приставки ПРЕ- и ПРИ-

**ПРИ-** пишется, если приставка обозначает:
- приближение: *при-ехать, при-плыть*
- присоединение: *при-шить, при-клеить*
- неполноту действия: *при-открыть, при-лечь*
- близость: *при-школьный, при-брежный*

**ПРЕ-** пишется, если обозначает:
- высшую степень: *пре-красный, пре-умный*
- то же, что ПЕРЕ-: *пре-ступить (=перешагнуть), пре-рвать*

## Безударные гласные в корне

**Проверяемые:** подбирается однокоренное слово с ударной гласной
- *вода* → *воды*
- *трава* → *травы*

**Непроверяемые (словарные):**
- *корабль, горизонт, аккуратный*

## Н и НН в прилагательных

**Одна Н:**
- суффиксы -ан-, -ян-, -ин-: *кожаный, серебряный, орлиный*
- исключения: *стеклянный, оловянный, деревянный*

**Две НН:**
- суффиксы -онн-, -енн-: *традиционный, соломенный*`,
    },
    'Пунктуация': {
      title: 'Основные правила пунктуации',
      content: `## Запятая в сложносочинённом предложении

Между частями ССП ставится запятая, если союзы: *и, а, но, да, однако, зато, либо, или*

**Исключение:** если у обоих предложений общий второстепенный член.

## Запятая при обособленных членах

**Обособляются:**
- причастные обороты (после определяемого слова)
- деепричастные обороты
- обстоятельства, выраженные существительными с предлогами *несмотря на, вопреки, ввиду*

## Двоеточие

Ставится:
- после обобщающего слова перед однородными членами
- в бессоюзном СП (второе предложение разъясняет первое)
- после слов автора перед прямой речью

## Тире

Ставится:
- между подлежащим и сказуемым-существительным
- после однородных членов перед обобщающим словом`,
    },
  },
  physics: {
    'Механика': {
      title: 'Основы механики: кинематика и динамика',
      content: `## Кинематика

**Равномерное движение:**
$$s = vt, \\quad v = \\text{const}$$

**Равноускоренное движение:**
$$s = v_0 t + \\frac{at^2}{2}, \\quad v = v_0 + at$$
$$v^2 = v_0^2 + 2as$$

**Свободное падение:** $a = g = 9.8 \\approx 10$ м/с²

## Законы Ньютона

**I закон:** Тело покоится или движется равномерно прямолинейно, если на него не действуют силы или они уравновешены.

**II закон:** $\\vec{F} = m\\vec{a}$

**III закон:** $\\vec{F}_{12} = -\\vec{F}_{21}$

## Работа и энергия

$$A = Fs\\cos\\alpha$$

**Кинетическая энергия:** $E_k = \\frac{mv^2}{2}$

**Потенциальная энергия:** $E_p = mgh$

**Закон сохранения энергии:** $E_k + E_p = \\text{const}$`,
    },
    'Электродинамика': {
      title: 'Электрический ток и цепи',
      content: `## Закон Ома

$$I = \\frac{U}{R}$$

где $I$ — сила тока (А), $U$ — напряжение (В), $R$ — сопротивление (Ом).

## Соединение резисторов

**Последовательное:**
$$R = R_1 + R_2 + ... + R_n$$
$$I = I_1 = I_2 = ... = I_n$$
$$U = U_1 + U_2 + ... + U_n$$

**Параллельное:**
$$\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2} + ... + \\frac{1}{R_n}$$
$$U = U_1 = U_2 = ... = U_n$$
$$I = I_1 + I_2 + ... + I_n$$

## Мощность и работа тока

$$P = UI = I^2R = \\frac{U^2}{R}$$

$$A = Pt = UIt = I^2Rt$$`,
    },
  },
  chemistry: {
    'Строение вещества': {
      title: 'Строение атома и химическая связь',
      content: `## Строение атома

**Ядро:** протоны (+) и нейтроны (0)
**Электронная оболочка:** электроны (-)

Число протонов = порядковому номеру элемента = числу электронов у нейтрального атома

**Электронные оболочки:**
- 1-й уровень: максимум 2 электрона
- 2-й уровень: максимум 8 электронов
- 3-й уровень: максимум 18 электронов

## Типы химических связей

**Ковалентная неполярная** — между одинаковыми атомами: $H_2$, $O_2$, $N_2$

**Ковалентная полярная** — между разными неметаллами: $H_2O$, $HCl$, $NH_3$

**Ионная** — между металлом и неметаллом: $NaCl$, $KOH$, $CaCO_3$

**Металлическая** — в металлах: $Fe$, $Cu$, $Al$

## Степень окисления

Сумма степеней окисления в молекуле = 0.
Сумма степеней окисления в ионе = заряду иона.

**Постоянные степени окисления:**
- Водород: +1 (кроме гидридов металлов)
- Кислород: -2 (кроме перекисей и $OF_2$)
- Металлы I группы: +1`,
    },
  },
  biology: {
    'Клетка и её строение': {
      title: 'Строение клетки',
      content: `## Клеточная теория

1. Клетка — элементарная единица живого
2. Новые клетки образуются только из клеток
3. Все живые организмы состоят из клеток

## Строение эукариотической клетки

**Клеточная мембрана** — отделяет клетку от среды, регулирует транспорт веществ.

**Ядро** — содержит ДНК (генетическую информацию), управляет жизнедеятельностью.

**Митохондрии** — «энергетические станции», синтезируют АТФ в ходе клеточного дыхания.

**Рибосомы** — синтезируют белки.

**Хлоропласты** (только в растениях) — осуществляют фотосинтез.

**ЭПС** (эндоплазматическая сеть) — транспорт веществ.

**Аппарат Гольджи** — сортировка и упаковка веществ.

**Лизосомы** — расщепление органических веществ.

## Сравнение клеток

| Признак | Прокариоты | Эукариоты |
|---------|-----------|-----------|
| Ядро | Нет | Есть |
| Митохондрии | Нет | Есть |
| Рибосомы | Есть | Есть |
| Хлоропласты | Нет | У растений |`,
    },
  },
};

const examConfigsData = {
  math: { durationMinutes: 180, totalQuestions: 30, passingScore: 18, structure: JSON.stringify([
    { type: 'A', count: 20, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Развёрнутый ответ' },
  ])},
  russian: { durationMinutes: 120, totalQuestions: 50, passingScore: 30, structure: JSON.stringify([
    { type: 'A', count: 40, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Текстовые задания' },
  ])},
  physics: { durationMinutes: 180, totalQuestions: 30, passingScore: 18, structure: JSON.stringify([
    { type: 'A', count: 20, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Задачи' },
  ])},
  chemistry: { durationMinutes: 180, totalQuestions: 30, passingScore: 18, structure: JSON.stringify([
    { type: 'A', count: 20, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Задачи' },
  ])},
  biology: { durationMinutes: 180, totalQuestions: 30, passingScore: 18, structure: JSON.stringify([
    { type: 'A', count: 20, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Развёрнутый ответ' },
  ])},
  history: { durationMinutes: 120, totalQuestions: 40, passingScore: 24, structure: JSON.stringify([
    { type: 'A', count: 30, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Задания на соответствие' },
  ])},
  english: { durationMinutes: 120, totalQuestions: 50, passingScore: 30, structure: JSON.stringify([
    { type: 'A', count: 40, points: 1, description: 'Multiple choice' },
    { type: 'B', count: 10, points: 2, description: 'Open-ended' },
  ])},
  belarusian: { durationMinutes: 120, totalQuestions: 50, passingScore: 30, structure: JSON.stringify([
    { type: 'A', count: 40, points: 1, description: 'Адзін правільны адказ' },
    { type: 'B', count: 10, points: 2, description: 'Пашыраны адказ' },
  ])},
  'world-history': { durationMinutes: 120, totalQuestions: 40, passingScore: 24, structure: JSON.stringify([
    { type: 'A', count: 30, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Задания на хронологию' },
  ])},
  'social-studies': { durationMinutes: 120, totalQuestions: 40, passingScore: 24, structure: JSON.stringify([
    { type: 'A', count: 30, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Анализ документов' },
  ])},
  geography: { durationMinutes: 120, totalQuestions: 40, passingScore: 24, structure: JSON.stringify([
    { type: 'A', count: 30, points: 1, description: 'Один правильный ответ' },
    { type: 'B', count: 10, points: 2, description: 'Работа с картой' },
  ])},
};

async function main() {
  console.log('🌱 Начинаю заполнение базы данных...');

  // Create admin user
  const adminPassword = await hashPassword('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ct-platform.by' },
    update: {},
    create: {
      email: 'admin@ct-platform.by',
      password: adminPassword,
      name: 'Администратор',
      role: 'ADMIN',
      plan: 'FREE',
    },
  });
  console.log(`✅ Создан администратор: ${admin.email}`);

  // Create demo user
  const demoPassword = await hashPassword('Demo123!');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@ct-platform.by' },
    update: {},
    create: {
      email: 'demo@ct-platform.by',
      password: demoPassword,
      name: 'Иван Иванов',
      role: 'USER',
      plan: 'FREE',
      city: 'Минск',
      school: 'Лицей №1',
      xp: 250,
      level: 3,
      streakDays: 5,
    },
  });
  console.log(`✅ Создан демо-пользователь: ${demo.email}`);

  // Create subjects and their topics, questions, theory
  for (const subjectData of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { slug: subjectData.slug },
      update: {},
      create: subjectData,
    });
    console.log(`📚 Предмет: ${subject.name}`);

    // Create topics
    const subjectTopics = topicsData[subjectData.slug] || [];
    const topicMap = {};

    for (const topicData of subjectTopics) {
      const topic = await prisma.topic.create({
        data: {
          ...topicData,
          subjectId: subject.id,
        },
      });
      topicMap[topicData.name] = topic;
    }

    // Create questions
    const subjectQuestions = questionsData[subjectData.slug] || {};
    let totalQuestionsCount = 0;

    for (const [topicName, questions] of Object.entries(subjectQuestions)) {
      const topic = topicMap[topicName];
      if (!topic) continue;

      for (const q of questions) {
        try {
          await prisma.question.create({
            data: {
              ...q,
              subjectId: subject.id,
              topicId: topic.id,
              status: 'ACTIVE',
              timesSolved: Math.floor(Math.random() * 500) + 50,
              timesCorrect: Math.floor(Math.random() * 300) + 20,
            },
          });
          totalQuestionsCount++;
        } catch (e) {
          // Skip duplicate externalIds
          if (!e.message.includes('Unique constraint')) {
            console.error('Error creating question:', e.message);
          }
        }
      }

      // Create theory
      const subjectTheory = theoryData[subjectData.slug] || {};
      if (subjectTheory[topicName]) {
        await prisma.theory.create({
          data: {
            ...subjectTheory[topicName],
            subjectId: subject.id,
            topicId: topic.id,
            tags: JSON.stringify([topicName.toLowerCase()]),
            status: 'ACTIVE',
          },
        });
      }
    }

    // Update subject stats
    await prisma.subject.update({
      where: { id: subject.id },
      data: {
        questionsCount: totalQuestionsCount,
        topicsCount: subjectTopics.length,
        rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
      },
    });

    // Create exam config
    const config = examConfigsData[subjectData.slug];
    if (config) {
      await prisma.examConfig.create({
        data: {
          ...config,
          subjectId: subject.id,
        },
      });
    }

    console.log(`  ✅ ${subjectTopics.length} тем, ${totalQuestionsCount} заданий`);
  }

  console.log('\n🎉 База данных успешно заполнена!');
  console.log('\n👤 Учётные данные для входа:');
  console.log('  Администратор: admin@ct-platform.by / Admin123!');
  console.log('  Демо-пользователь: demo@ct-platform.by / Demo123!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении БД:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
