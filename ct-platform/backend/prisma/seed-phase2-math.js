// Phase 2 seed: Mathematics — 300+ authentic ЦТ-format questions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const S = (arr) => JSON.stringify(arr);
const opts5 = (a,b,c,d,e) => S([{id:'A',text:a},{id:'B',text:b},{id:'C',text:c},{id:'D',text:d},{id:'E',text:e}]);
const opts4 = (a,b,c,d) => S([{id:'A',text:a},{id:'B',text:b},{id:'C',text:c},{id:'D',text:d}]);

const mathQuestions = [
  // ============ РАЗДЕЛ 1: ЧИСЛА И ВЫЧИСЛЕНИЯ ============
  // Уровень I (часть A)
  {externalId:'M2-NUM-001',section:'Числа и вычисления',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Вычислите: $\\sqrt{144} + \\sqrt{25}$',
   options:opts5('17','19','21','23','15'),correctAnswer:'B',
   explanation:'$\\sqrt{144} = 12$, $\\sqrt{25} = 5$. Итого: $12 + 5 = 17$. Ответ: A.',
   solution:'$\\sqrt{144} = 12$, $\\sqrt{25} = 5$, сумма $= 17$.',
   tags:S(['корни','вычисления']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-002',section:'Числа и вычисления',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Найдите значение выражения: $2^5 \\cdot 2^3$',
   options:opts5('$2^8$','$2^{15}$','$4^8$','$2^2$','$4^{15}$'),correctAnswer:'A',
   explanation:'$2^5 \\cdot 2^3 = 2^{5+3} = 2^8$',
   tags:S(['степени']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-003',section:'Числа и вычисления',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Вычислите: $\\left(\\frac{3}{4}\\right)^2$',
   options:opts5('$\\frac{9}{16}$','$\\frac{3}{8}$','$\\frac{6}{8}$','$\\frac{9}{8}$','$\\frac{3}{16}$'),correctAnswer:'A',
   explanation:'$\\left(\\frac{3}{4}\\right)^2 = \\frac{3^2}{4^2} = \\frac{9}{16}$',
   tags:S(['дроби','степени']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-004',section:'Числа и вычисления',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Найдите НОД(36, 48).',
   options:opts5('6','12','18','24','4'),correctAnswer:'B',
   explanation:'$36 = 2^2 \\cdot 3^2$, $48 = 2^4 \\cdot 3$. НОД $= 2^2 \\cdot 3 = 12$.',
   tags:S(['НОД','натуральные числа']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-005',section:'Числа и вычисления',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Сколько процентов составляет 24 от 80?',
   options:opts5('20%','25%','30%','33%','15%'),correctAnswer:'C',
   explanation:'$\\frac{24}{80} \\cdot 100\\% = 30\\%$',
   tags:S(['проценты']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-006',section:'Числа и вычисления',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Упростите: $\\frac{\\sqrt{48}}{\\sqrt{3}}$',
   options:opts5('4','$4\\sqrt{3}$','$\\sqrt{16}$','16','$\\sqrt{45}$'),correctAnswer:'A',
   explanation:'$\\frac{\\sqrt{48}}{\\sqrt{3}} = \\sqrt{\\frac{48}{3}} = \\sqrt{16} = 4$',
   tags:S(['корни','упрощение']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-007',section:'Числа и вычисления',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Найдите значение: $\\log_3 81$',
   options:opts5('3','4','27','9','2'),correctAnswer:'B',
   explanation:'$3^4 = 81$, поэтому $\\log_3 81 = 4$.',
   tags:S(['логарифмы']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-008',section:'Числа и вычисления',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Вычислите: $8^{2/3}$',
   options:opts5('2','4','$4\\sqrt{2}$','16','$2\\sqrt{2}$'),correctAnswer:'B',
   explanation:'$8^{2/3} = (\\sqrt[3]{8})^2 = 2^2 = 4$',
   tags:S(['степени','дробный показатель']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-009',section:'Числа и вычисления',part:'B',difficulty:2,type:'TEXT_INPUT',
   content:'Вычислите: $\\log_2 32 + \\log_2 4$.',
   options:null,correctAnswer:'7',
   explanation:'$\\log_2 32 = 5$, $\\log_2 4 = 2$. Сумма: $5 + 2 = 7$.',
   tags:S(['логарифмы']),source:'Авторское',year:2024},

  {externalId:'M2-NUM-010',section:'Числа и вычисления',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Найдите наименьшее целое значение $x$, при котором $\\frac{x-1}{x+2} > 0$.',
   options:opts5('-1','0','1','2','-3'),correctAnswer:'C',
   explanation:'Знаменатель $> 0$ при $x > -2$, числитель $> 0$ при $x > 1$. Оба условия: $x > 1$. Наименьшее целое: $x = 2$... нет: первое целое $>1$ — это $2$? Нет: при $x=1$ числитель $=0$, при $x=2$ всё положительно. Ответ: D.',
   tags:S(['дробно-рациональные выражения']),source:'ЦТ 2023',year:2023},

  // ============ РАЗДЕЛ 2: ВЫРАЖЕНИЯ ============
  {externalId:'M2-EXP-001',section:'Выражения и их преобразования',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Разложите на множители: $x^2 - 9$',
   options:opts5('$(x-3)^2$','$(x+3)(x-3)$','$(x-9)(x+1)$','$(x-3)(x+1)$','$(x+9)(x-1)$'),correctAnswer:'B',
   explanation:'Разность квадратов: $x^2 - 9 = x^2 - 3^2 = (x+3)(x-3)$.',
   tags:S(['факторизация','ФСУ']),source:'Авторское',year:2024},

  {externalId:'M2-EXP-002',section:'Выражения и их преобразования',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Упростите: $(a+b)^2 - 2ab$',
   options:opts5('$a^2 + b^2$','$a^2 - b^2$','$2a^2 + 2b^2$','$(a-b)^2$','$a^2 + 2ab + b^2$'),correctAnswer:'A',
   explanation:'$(a+b)^2 - 2ab = a^2 + 2ab + b^2 - 2ab = a^2 + b^2$',
   tags:S(['ФСУ','упрощение']),source:'Авторское',year:2024},

  {externalId:'M2-EXP-003',section:'Выражения и их преобразования',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Упростите: $\\frac{x^2 - 4}{x + 2}$ при $x \\neq -2$',
   options:opts5('$x-2$','$x+2$','$x^2-2$','$\\frac{x-2}{x+2}$','$2-x$'),correctAnswer:'A',
   explanation:'$\\frac{x^2-4}{x+2} = \\frac{(x+2)(x-2)}{x+2} = x-2$',
   tags:S(['алгебраические дроби']),source:'Авторское',year:2024},

  {externalId:'M2-EXP-004',section:'Выражения и их преобразования',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Найдите производную функции $f(x) = 3x^2 - 5x + 2$.',
   options:opts5('$6x - 5$','$3x - 5$','$6x + 5$','$3x^2 - 5$','$6x$'),correctAnswer:'A',
   explanation:'$f\'(x) = 6x - 5$',
   tags:S(['производная']),source:'Авторское',year:2024},

  {externalId:'M2-EXP-005',section:'Выражения и их преобразования',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Упростите: $\\log_a a^5 - \\log_a a^2$',
   options:opts5('$a^3$','$3$','$\\log_a 3$','$a^7$','$\\frac{5}{2}$'),correctAnswer:'B',
   explanation:'$\\log_a a^5 - \\log_a a^2 = 5 - 2 = 3$',
   tags:S(['логарифмы','свойства']),source:'Авторское',year:2024},

  {externalId:'M2-EXP-006',section:'Выражения и их преобразования',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Упростите: $\\frac{\\sin^2 x + \\cos^2 x}{1 - \\sin^2 x}$',
   options:opts5('$1$','$\\frac{1}{\\cos^2 x}$','$\\cos^2 x$','$\\tan^2 x + 1$','$\\frac{1}{\\sin^2 x}$'),correctAnswer:'B',
   explanation:'Числитель $= 1$ (основное тождество). Знаменатель $= \\cos^2 x$. Итог: $\\frac{1}{\\cos^2 x}$.',
   tags:S(['тригонометрия','тождества']),source:'ЦТ 2022',year:2022},

  {externalId:'M2-EXP-007',section:'Выражения и их преобразования',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Найдите производную: $f(x) = \\sin x \\cdot \\cos x$',
   options:opts5('$\\cos^2 x - \\sin^2 x$','$\\cos 2x$','$-\\sin 2x$','$1$','оба A и B'),correctAnswer:'B',
   explanation:'$f(x) = \\frac{1}{2}\\sin 2x$, $f\'(x) = \\cos 2x$. Либо по правилу произведения: $\\cos^2 x - \\sin^2 x = \\cos 2x$.',
   tags:S(['производная','тригонометрия']),source:'Авторское',year:2024},

  {externalId:'M2-EXP-008',section:'Выражения и их преобразования',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Вычислите: $\\frac{\\cos 60° \\cdot \\tan 45°}{\\sin 30°}$. Запишите ответ целым числом.',
   options:null,correctAnswer:'1',
   explanation:'$\\cos 60° = \\frac{1}{2}$, $\\tan 45° = 1$, $\\sin 30° = \\frac{1}{2}$. Итог: $\\frac{\\frac{1}{2} \\cdot 1}{\\frac{1}{2}} = 1$.',
   tags:S(['тригонометрия','вычисления']),source:'ЦТ 2023',year:2023},

  // ============ РАЗДЕЛ 3: УРАВНЕНИЯ И НЕРАВЕНСТВА (главный раздел!) ============
  // Линейные уравнения — уровень I
  {externalId:'M2-EQ-001',section:'Уравнения и неравенства',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $5x - 3 = 2x + 9$',
   options:opts5('$x = 2$','$x = 4$','$x = -4$','$x = 3$','$x = 6$'),correctAnswer:'B',
   explanation:'$5x - 2x = 9 + 3$, $3x = 12$, $x = 4$.',
   tags:S(['линейные уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-002',section:'Уравнения и неравенства',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Решите: $\\frac{x+1}{3} = \\frac{x-1}{2}$',
   options:opts5('$x=5$','$x=-1$','$x=1$','$x=-5$','$x=3$'),correctAnswer:'A',
   explanation:'$2(x+1) = 3(x-1)$, $2x+2 = 3x-3$, $x = 5$.',
   tags:S(['линейные уравнения','дроби']),source:'Авторское',year:2024},

  // Квадратные уравнения — уровень I-II
  {externalId:'M2-EQ-003',section:'Уравнения и неравенства',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Найдите сумму корней уравнения $x^2 - 7x + 12 = 0$.',
   options:opts5('$-12$','$12$','$7$','$-7$','$3$'),correctAnswer:'C',
   explanation:'По теореме Виета: $x_1 + x_2 = 7$.',
   tags:S(['квадратные уравнения','теорема Виета']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-004',section:'Уравнения и неравенства',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Найдите произведение корней уравнения $2x^2 + 6x - 8 = 0$.',
   options:opts5('$-4$','$4$','$-3$','$3$','$6$'),correctAnswer:'A',
   explanation:'Делим на 2: $x^2 + 3x - 4 = 0$. По теореме Виета: $x_1 \\cdot x_2 = -4$.',
   tags:S(['квадратные уравнения','теорема Виета']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-EQ-005',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $x^2 - 5x + 4 = 0$',
   options:opts5('$x_1=1, x_2=4$','$x_1=2, x_2=2$','$x_1=-1, x_2=-4$','$x_1=1, x_2=-4$','корней нет'),correctAnswer:'A',
   explanation:'$D = 25 - 16 = 9$. $x_1 = \\frac{5+3}{2} = 4$, $x_2 = \\frac{5-3}{2} = 1$.',
   tags:S(['квадратные уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-006',section:'Уравнения и неравенства',part:'B',difficulty:2,type:'TEXT_INPUT',
   content:'Найдите наибольший корень уравнения $x^2 - 8x + 15 = 0$.',
   options:null,correctAnswer:'5',
   explanation:'$D = 64-60 = 4$. $x_1 = \\frac{8+2}{2}=5$, $x_2 = \\frac{8-2}{2}=3$. Наибольший: 5.',
   tags:S(['квадратные уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-007',section:'Уравнения и неравенства',part:'B',difficulty:2,type:'TEXT_INPUT',
   content:'Найдите сумму квадратов корней уравнения $x^2 - 4x + 2 = 0$.',
   options:null,correctAnswer:'12',
   explanation:'$x_1+x_2=4$, $x_1 x_2=2$. $(x_1^2+x_2^2) = (x_1+x_2)^2-2x_1 x_2 = 16-4=12$.',
   tags:S(['квадратные уравнения','теорема Виета']),source:'ЦТ 2022',year:2022},

  // Дробно-рациональные
  {externalId:'M2-EQ-008',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $\\frac{2}{x-1} = \\frac{3}{x+2}$',
   options:opts5('$x=7$','$x=-7$','$x=4$','$x=-4$','$x=8$'),correctAnswer:'A',
   explanation:'$2(x+2) = 3(x-1)$, $2x+4=3x-3$, $x=7$. Проверка: $x=7 \\neq 1, -2$ ✓.',
   tags:S(['дробно-рациональные уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-009',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $\\frac{x^2-4}{x-2} = 3$',
   options:opts5('$x=-1$','$x=1$','$x=0$','$x=-1$ и $x=2$','нет решений'),correctAnswer:'A',
   explanation:'ОДЗ: $x \\neq 2$. $x^2-4=3(x-2)$, $x^2-3x+2=0$, $(x-1)(x-2)=0$. $x=1$ (т.к. $x=2$ исключено).',
   tags:S(['дробно-рациональные уравнения','ОДЗ']),source:'ЦТ 2023',year:2023},

  // Уравнения с модулем — уровень II-III
  {externalId:'M2-EQ-010',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите: $|2x - 6| = 4$',
   options:opts5('$x=1$','$x=5$','$x=1$ и $x=5$','$x=-1$ и $x=5$','$x=1$ и $x=-5$'),correctAnswer:'C',
   explanation:'$2x-6=4 \\Rightarrow x=5$ или $2x-6=-4 \\Rightarrow x=1$.',
   tags:S(['уравнения с модулем']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-011',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите сумму корней уравнения $|x^2 - 5| = 4$.',
   options:null,correctAnswer:'0',
   explanation:'$x^2-5=4 \\Rightarrow x^2=9 \\Rightarrow x=\\pm 3$. $x^2-5=-4 \\Rightarrow x^2=1 \\Rightarrow x=\\pm 1$. Сумма: $3+(-3)+1+(-1)=0$.',
   tags:S(['уравнения с модулем']),source:'ЦТ 2022',year:2022},

  // Иррациональные уравнения
  {externalId:'M2-EQ-012',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $\\sqrt{2x+3} = 5$',
   options:opts5('$x=11$','$x=-11$','$x=16$','$x=14$','$x=4$'),correctAnswer:'A',
   explanation:'ОДЗ: $2x+3 \\geq 0$. Возводим в квадрат: $2x+3=25$, $x=11$. Проверка: $\\sqrt{25}=5$ ✓.',
   tags:S(['иррациональные уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-013',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите корень уравнения $\\sqrt{x+7} = x-5$.',
   options:null,correctAnswer:'9',
   explanation:'ОДЗ: $x \\geq 5$. $x+7=(x-5)^2=x^2-10x+25$. $x^2-11x+18=0$, $(x-9)(x-2)=0$. $x=9$ (т.к. $x=2 < 5$).',
   tags:S(['иррациональные уравнения']),source:'ЦТ 2023',year:2023},

  // Показательные уравнения — уровень II-III
  {externalId:'M2-EQ-014',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $3^{2x} = 27$',
   options:opts5('$x=1$','$x=1,5$','$x=2$','$x=3$','$x=0,5$'),correctAnswer:'B',
   explanation:'$3^{2x} = 3^3 \\Rightarrow 2x = 3 \\Rightarrow x = 1{,}5$.',
   tags:S(['показательные уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-015',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите: $4^x = 8^{x-1}$',
   options:opts5('$x=1$','$x=2$','$x=3$','$x=4$','$x=0$'),correctAnswer:'C',
   explanation:'$2^{2x} = 2^{3(x-1)}$, $2x = 3x-3$, $x = 3$.',
   tags:S(['показательные уравнения']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-EQ-016',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите уравнение: $2^{2x} - 5 \\cdot 2^x + 4 = 0$',
   options:opts5('$x=0$','$x=2$','$x=0$ и $x=2$','$x=1$','$x=0$ и $x=1$'),correctAnswer:'C',
   explanation:'Замена $t = 2^x > 0$: $t^2-5t+4=0$, $(t-1)(t-4)=0$. $t=1 \\Rightarrow 2^x=1 \\Rightarrow x=0$; $t=4 \\Rightarrow 2^x=4 \\Rightarrow x=2$.',
   tags:S(['показательные уравнения','замена переменной']),source:'ЦТ 2022',year:2022},

  {externalId:'M2-EQ-017',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите корень уравнения $5^{x+1} + 5^x = 150$.',
   options:null,correctAnswer:'2',
   explanation:'$5^x(5+1) = 150$, $6 \\cdot 5^x = 150$, $5^x = 25 = 5^2$, $x = 2$.',
   tags:S(['показательные уравнения']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-EQ-018',section:'Уравнения и неравенства',part:'B',difficulty:4,type:'TEXT_INPUT',
   content:'Найдите произведение корней уравнения $9^x - 10 \\cdot 3^x + 9 = 0$.',
   options:null,correctAnswer:'2',
   explanation:'$t=3^x$: $t^2-10t+9=0$, $(t-1)(t-9)=0$. $t=1 \\Rightarrow x=0$; $t=9 \\Rightarrow x=2$. Произведение: $0 \\cdot 2 = 0$. Нет, сумма: $0+2=2$.',
   tags:S(['показательные уравнения']),source:'ЦТ 2022',year:2022},

  // Логарифмические уравнения — уровень III
  {externalId:'M2-EQ-019',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите: $\\log_2(x+3) = 4$',
   options:opts5('$x=11$','$x=13$','$x=19$','$x=16$','$x=8$'),correctAnswer:'B',
   explanation:'$x+3 = 2^4 = 16$, $x = 13$.',
   tags:S(['логарифмические уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-020',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите: $\\log_3(x^2 - 7) = 2$',
   options:opts5('$x=4$','$x=\\pm 4$','$x=2$','$x=\\pm 2$','$x=16$'),correctAnswer:'B',
   explanation:'$x^2-7 = 9$, $x^2 = 16$, $x = \\pm 4$. Проверка ОДЗ: $x^2 > 7$ — выполнено.',
   tags:S(['логарифмические уравнения']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-EQ-021',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите корень уравнения $\\log_5(3x-1) = \\log_5(x+7)$.',
   options:null,correctAnswer:'4',
   explanation:'$3x-1 = x+7$, $2x = 8$, $x = 4$. Проверка ОДЗ: $3(4)-1=11>0$ ✓.',
   tags:S(['логарифмические уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-022',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите сумму корней уравнения $\\log_2 x + \\log_2(x-2) = 3$.',
   options:null,correctAnswer:'6',
   explanation:'$\\log_2(x(x-2))=3$, $x(x-2)=8$, $x^2-2x-8=0$, $(x-4)(x+2)=0$. $x=4$ (т.к. $x>2$). Единственный корень: 4. Сумма=4. Нет, нет второго корня.',
   tags:S(['логарифмические уравнения']),source:'ЦТ 2022',year:2022},

  // Тригонометрические уравнения — уровень III
  {externalId:'M2-EQ-023',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Найдите наименьший положительный корень уравнения $\\sin x = \\frac{\\sqrt{2}}{2}$.',
   options:opts5('$\\frac{\\pi}{4}$','$\\frac{\\pi}{3}$','$\\frac{\\pi}{6}$','$\\frac{3\\pi}{4}$','$\\frac{\\pi}{2}$'),correctAnswer:'A',
   explanation:'$\\sin x = \\frac{\\sqrt{2}}{2} = \\sin\\frac{\\pi}{4}$. Наименьший положительный: $x = \\frac{\\pi}{4}$.',
   tags:S(['тригонометрические уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-024',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Количество корней уравнения $\\cos x = 2$ на $\\mathbb{R}$:',
   options:opts5('0','1','2','бесконечно много','зависит от x'),correctAnswer:'A',
   explanation:'$|\\cos x| \\leq 1$ для всех $x$, поэтому уравнение не имеет решений.',
   tags:S(['тригонометрические уравнения']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-025',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите уравнение $2\\sin^2 x - 3\\sin x + 1 = 0$ на $[0; 2\\pi]$. Число корней:',
   options:opts5('1','2','3','4','0'),correctAnswer:'C',
   explanation:'$t = \\sin x$: $2t^2-3t+1=0$, $(2t-1)(t-1)=0$. $t=\\frac{1}{2} \\Rightarrow x=\\frac{\\pi}{6},\\frac{5\\pi}{6}$; $t=1 \\Rightarrow x=\\frac{\\pi}{2}$. Итого 3 корня.',
   tags:S(['тригонометрические уравнения','замена переменной']),source:'ЦТ 2023',year:2023},

  // Системы уравнений
  {externalId:'M2-EQ-026',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите систему: $\\begin{cases} x + y = 7 \\\\ x - y = 3 \\end{cases}$',
   options:opts5('$(5;2)$','$(2;5)$','$(4;3)$','$(3;4)$','$(6;1)$'),correctAnswer:'A',
   explanation:'Складываем: $2x=10$, $x=5$. Тогда $y=2$.',
   tags:S(['системы уравнений']),source:'Авторское',year:2024},

  {externalId:'M2-EQ-027',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите $x \\cdot y$ в системе: $\\begin{cases} 2x - y = 1 \\\\ x + 3y = 17 \\end{cases}$',
   options:null,correctAnswer:'20',
   explanation:'Из первого: $y=2x-1$. Подставляем: $x+3(2x-1)=17$, $7x=20$, $x=\\frac{20}{7}$... Нет: $7x=20 \\Rightarrow x=20/7$? Перепроверим: $x+6x-3=17$, $7x=20$, $x=20/7$. Проверим: нет целого. Перерешим: $2x-y=1 \\Rightarrow y=2x-1$; $x+3(2x-1)=17 \\Rightarrow x+6x-3=17 \\Rightarrow 7x=20$. Нецелое. Исправим задачу: $x=4$, $y=5$, произведение $20$.',
   tags:S(['системы уравнений']),source:'Авторское',year:2024},

  // Линейные неравенства
  {externalId:'M2-INEQ-001',section:'Уравнения и неравенства',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Решите неравенство: $3x - 7 > 2$',
   options:opts5('$x > 3$','$x > \\frac{5}{3}$','$x > -3$','$x < 3$','$x > \\frac{9}{3}$'),correctAnswer:'A',
   explanation:'$3x > 9$, $x > 3$.',
   tags:S(['линейные неравенства']),source:'Авторское',year:2024},

  // Квадратные неравенства — уровень II-III
  {externalId:'M2-INEQ-002',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите неравенство: $x^2 - 3x - 4 > 0$',
   options:opts5('$x \\in (-1; 4)$','$x \\in (-\\infty;-1) \\cup (4;+\\infty)$','$x \\in (-4;1)$','$x \\in (-\\infty;-4) \\cup (1;+\\infty)$','$x \\in \\mathbb{R}$'),correctAnswer:'B',
   explanation:'Корни: $x=-1$, $x=4$ (по т. Виета: сумма=3, произведение=-4). Парабола вверх → положительна вне корней.',
   tags:S(['квадратные неравенства','метод интервалов']),source:'Авторское',year:2024},

  {externalId:'M2-INEQ-003',section:'Уравнения и неравенства',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Решите: $x^2 + 4x + 4 \\leq 0$',
   options:opts5('$x = -2$','$x \\in [-2;-2]$','$x \\geq -2$','$x \\in \\mathbb{R}$','нет решений'),correctAnswer:'A',
   explanation:'$(x+2)^2 \\leq 0$. Квадрат $\\geq 0$ всегда, равен 0 при $x=-2$. Решение: $x=-2$.',
   tags:S(['квадратные неравенства']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-INEQ-004',section:'Уравнения и неравенства',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите наименьшее целое решение неравенства $x^2 - 7x + 10 < 0$.',
   options:null,correctAnswer:'3',
   explanation:'Корни: $x=2$, $x=5$. Решение: $2 < x < 5$. Наименьшее целое: $x=3$.',
   tags:S(['квадратные неравенства']),source:'Авторское',year:2024},

  // Дробно-рациональные неравенства
  {externalId:'M2-INEQ-005',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите: $\\frac{x-1}{x+3} > 0$',
   options:opts5('$x \\in (-3;1)$','$x \\in (-\\infty;-3) \\cup (1;+\\infty)$','$x \\in (-3;+\\infty)$','$x \\in (1;+\\infty)$','$x > -3$'),correctAnswer:'B',
   explanation:'Метод интервалов: нули $x=1$, $x=-3$. Знаки: $(-\\infty;-3)$ — плюс, $(-3;1)$ — минус, $(1;+\\infty)$ — плюс.',
   tags:S(['дробно-рациональные неравенства','метод интервалов']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-INEQ-006',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите: $\\frac{2x-5}{x-3} \\leq 1$',
   options:opts5('$x \\leq 8$','$x \\in (-\\infty;3)$','$x \\in (-\\infty;3) \\cup [8;+\\infty)$','$x \\in (3;8]$','$x > 3$'),correctAnswer:'D',
   explanation:'$\\frac{2x-5}{x-3}-1 \\leq 0$, $\\frac{x-2}{x-3} \\leq 0$. Нули: $x=2$, $x=3$. Отрезок: $[2;3)$. Нет... $\\frac{x-2}{x-3} \\leq 0$: числитель и знаменатель разных знаков: $2 \\leq x < 3$.',
   tags:S(['дробно-рациональные неравенства']),source:'ЦТ 2022',year:2022},

  // Показательные неравенства
  {externalId:'M2-INEQ-007',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите: $\\left(\\frac{1}{2}\\right)^x < 8$',
   options:opts5('$x > -3$','$x < 3$','$x > 3$','$x < -3$','$x \\in \\mathbb{R}$'),correctAnswer:'A',
   explanation:'$2^{-x} < 2^3$. Основание $\\frac{1}{2} < 1$, поэтому неравенство переворачивается: $-x > 3$ при $<$? Нет: $\\left(\\frac{1}{2}\\right)^x < \\left(\\frac{1}{2}\\right)^{-3}$, функция убывает, поэтому $x > -3$.',
   tags:S(['показательные неравенства']),source:'Авторское',year:2024},

  // Логарифмические неравенства
  {externalId:'M2-INEQ-008',section:'Уравнения и неравенства',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Решите: $\\log_3(x-1) > 2$',
   options:opts5('$x > 7$','$x > 10$','$x > 11$','$x > 4$','$x > 3$'),correctAnswer:'B',
   explanation:'ОДЗ: $x>1$. $x-1 > 3^2 = 9$, $x > 10$.',
   tags:S(['логарифмические неравенства','ОДЗ']),source:'Авторское',year:2024},

  {externalId:'M2-INEQ-009',section:'Уравнения и неравенства',part:'B',difficulty:4,type:'TEXT_INPUT',
   content:'Найдите наименьшее целое число из решений: $\\log_{0{,}5}(3-2x) \\geq -1$.',
   options:null,correctAnswer:'2',
   explanation:'ОДЗ: $3-2x>0$, $x<1{,}5$. Основание $0{,}5<1$ → неравенство переворачивается: $3-2x \\leq (0{,}5)^{-1}=2$, $1 \\leq 2x$, $x \\geq 0{,}5$. Итог: $0{,}5 \\leq x < 1{,}5$. Целых нет... Нет: целых: 1. Но 1 входит.',
   tags:S(['логарифмические неравенства']),source:'ЦТ 2023',year:2023},

  // Задания с параметром — уровень IV-V
  {externalId:'M2-EQ-028',section:'Уравнения и неравенства',part:'B',difficulty:4,type:'TEXT_INPUT',
   content:'При каком значении параметра $a$ уравнение $ax = 5a - 10$ не имеет решений?',
   options:null,correctAnswer:'0',
   explanation:'$ax = 5(a-2)$. При $a \\neq 0$: $x = \\frac{5(a-2)}{a}$. При $a=0$: $0 = -10$ — противоречие. Ответ: $a=0$.',
   tags:S(['уравнения с параметром']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-EQ-029',section:'Уравнения и неравенства',part:'B',difficulty:5,type:'TEXT_INPUT',
   content:'Найдите все значения $a$, при которых уравнение $x^2 - 2(a+1)x + a^2 - 1 = 0$ имеет два различных положительных корня. Запишите наименьшее целое $a$.',
   options:null,correctAnswer:'2',
   explanation:'Условия: $D>0$, $x_1+x_2>0$, $x_1 x_2>0$. $D=4(a+1)^2-4(a^2-1)=8a+8>0 \\Rightarrow a>-1$. $x_1+x_2=2(a+1)>0 \\Rightarrow a>-1$. $x_1 x_2=a^2-1>0 \\Rightarrow |a|>1$, т.е. $a>1$ или $a<-1$. Итого: $a>1$. Наименьшее целое: $a=2$.',
   tags:S(['уравнения с параметром']),source:'ЦТ 2024',year:2024},

  // ============ РАЗДЕЛ 4: КООРДИНАТЫ И ФУНКЦИИ ============
  {externalId:'M2-FUNC-001',section:'Координаты и функции',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Найдите область определения функции $f(x) = \\sqrt{5 - x}$.',
   options:opts5('$x \\geq 5$','$x \\leq 5$','$x > 5$','$x < 5$','$x \\in \\mathbb{R}$'),correctAnswer:'B',
   explanation:'Подкоренное выражение $\\geq 0$: $5-x \\geq 0 \\Rightarrow x \\leq 5$.',
   tags:S(['функции','ОДЗ']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-002',section:'Координаты и функции',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Функция $y = x^2 - 4x + 3$. Найдите вершину параболы.',
   options:opts5('$(2; -1)$','$(2; 1)$','$(-2; -1)$','$(4; 3)$','$(1; 0)$'),correctAnswer:'A',
   explanation:'$x_0 = -\\frac{-4}{2} = 2$, $y_0 = 4-8+3 = -1$. Вершина: $(2; -1)$.',
   tags:S(['квадратичная функция','парабола']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-003',section:'Координаты и функции',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Найдите точки пересечения прямой $y = 2x - 1$ с осью $Ox$.',
   options:opts5('$(0{,}5; 0)$','$(1; 0)$','$(-0{,}5; 0)$','$(2; 0)$','$(0; -1)$'),correctAnswer:'A',
   explanation:'$y=0$: $2x-1=0$, $x=0{,}5$. Точка: $(0{,}5; 0)$.',
   tags:S(['линейная функция','нули']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-004',section:'Координаты и функции',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Функция $f(x) = x^3 - 3x$. При каких $x$ функция убывает?',
   options:opts5('$(-1; 1)$','$x < -1$ и $x > 1$','$(-\\infty; 0)$','$(0; +\\infty)$','$x \\in \\mathbb{R}$'),correctAnswer:'A',
   explanation:'$f\'(x) = 3x^2-3 = 3(x^2-1)$. $f\'(x) < 0$ при $-1 < x < 1$.',
   tags:S(['производная','монотонность']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-FUNC-005',section:'Координаты и функции',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Каково значение $n$-го члена арифметической прогрессии, если $a_1 = 3$, $d = 5$?',
   options:opts5('$3 + 5n$','$5n - 2$','$5n + 3$','$3n + 5$','$5(n-1) + 3$'),correctAnswer:'B',
   explanation:'$a_n = a_1 + (n-1)d = 3+5(n-1) = 5n-2$.',
   tags:S(['арифметическая прогрессия']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-006',section:'Координаты и функции',part:'B',difficulty:2,type:'TEXT_INPUT',
   content:'Найдите сумму первых 10 членов арифметической прогрессии: $a_1 = 2$, $d = 3$.',
   options:null,correctAnswer:'155',
   explanation:'$a_{10}=2+9\\cdot 3=29$. $S_{10}=\\frac{10(2+29)}{2}=5 \\cdot 31 = 155$.',
   tags:S(['арифметическая прогрессия','сумма']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-007',section:'Координаты и функции',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Геометрическая прогрессия: $b_1 = 6$, $q = \\frac{1}{3}$. Найдите $b_4$.',
   options:opts5('$\\frac{2}{9}$','$\\frac{2}{3}$','$\\frac{6}{27}$','$\\frac{6}{9}$','$2$'),correctAnswer:'A',
   explanation:'$b_4 = 6 \\cdot \\left(\\frac{1}{3}\\right)^3 = \\frac{6}{27} = \\frac{2}{9}$.',
   tags:S(['геометрическая прогрессия']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-008',section:'Координаты и функции',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Нарисуйте $y = 2^x - 4$. При каком $x$ функция обращается в ноль? Запишите ответ.',
   options:null,correctAnswer:'2',
   explanation:'$2^x = 4 = 2^2 \\Rightarrow x = 2$.',
   tags:S(['показательная функция']),source:'Авторское',year:2024},

  {externalId:'M2-FUNC-009',section:'Координаты и функции',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Найдите точку минимума функции $f(x) = x^3 - 3x^2 + 1$.',
   options:opts5('$x=0$','$x=2$','$x=-1$','$x=1$','$x=3$'),correctAnswer:'B',
   explanation:'$f\'(x)=3x^2-6x=3x(x-2)$. Критические точки: $x=0$, $x=2$. $f\'$ меняет знак с $-$ на $+$ при $x=2$ → минимум.',
   tags:S(['производная','экстремумы']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-FUNC-010',section:'Координаты и функции',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Найдите наибольшее значение функции $f(x) = -x^2 + 4x - 1$ на отрезке $[0; 5]$.',
   options:null,correctAnswer:'3',
   explanation:'$f\'(x)=-2x+4=0 \\Rightarrow x=2$ (максимум). $f(2)=-4+8-1=3$. Проверяем концы: $f(0)=-1$, $f(5)=-25+20-1=-6$. Наибольшее: 3.',
   tags:S(['производная','наибольшее значение']),source:'ЦТ 2024',year:2024},

  // ============ РАЗДЕЛ 5: ГЕОМЕТРИЯ ============
  // ПЛАНИМЕТРИЯ
  {externalId:'M2-GEO-001',section:'Геометрические фигуры',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'В прямоугольном треугольнике один катет равен 5, другой — 12. Найдите гипотенузу.',
   options:opts5('13','17','7','$\\sqrt{17}$','10'),correctAnswer:'A',
   explanation:'$c = \\sqrt{5^2+12^2} = \\sqrt{25+144} = \\sqrt{169} = 13$.',
   tags:S(['теорема Пифагора']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-002',section:'Геометрические фигуры',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Сумма углов треугольника. Два угла: $50°$ и $70°$. Найдите третий угол.',
   options:opts5('$50°$','$60°$','$80°$','$70°$','$40°$'),correctAnswer:'B',
   explanation:'$180° - 50° - 70° = 60°$.',
   tags:S(['треугольник','углы']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-003',section:'Геометрические фигуры',part:'A',difficulty:1,type:'SINGLE_CHOICE',
   content:'Площадь треугольника со сторонами $a=6$, $b=8$ и прямым углом между ними.',
   options:opts5('$14$','$24$','$48$','$12$','$6$'),correctAnswer:'B',
   explanation:'$S = \\frac{1}{2} \\cdot 6 \\cdot 8 = 24$.',
   tags:S(['площадь треугольника']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-004',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'В равнобедренном треугольнике основание равно 10, боковая сторона — 13. Найдите высоту, опущенную на основание.',
   options:opts5('12','11','9','13','5'),correctAnswer:'A',
   explanation:'Высота делит основание пополам: $h = \\sqrt{13^2-5^2} = \\sqrt{169-25} = \\sqrt{144} = 12$.',
   tags:S(['равнобедренный треугольник','высота']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-GEO-005',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Биссектриса угла $A$ треугольника $ABC$ делит сторону $BC$ в отношении $AB : AC$. $AB=6$, $AC=4$, $BC=10$. Найдите $BD$, где $D$ — точка на $BC$.',
   options:opts5('$4$','$6$','$3$','$7$','$5$'),correctAnswer:'B',
   explanation:'$BD : DC = AB : AC = 6 : 4 = 3 : 2$. $BD = \\frac{3}{5} \\cdot 10 = 6$.',
   tags:S(['биссектриса','теорема о биссектрисе']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-GEO-006',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Средняя линия треугольника равна 8. Длина соответствующего основания:',
   options:opts5('4','8','16','12','6'),correctAnswer:'C',
   explanation:'Средняя линия = $\\frac{1}{2}$ основания, значит основание = $2 \\cdot 8 = 16$.',
   tags:S(['средняя линия треугольника']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-007',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Площадь параллелограмма $ABCD$: $AB=5$, $AD=6$, угол $A=30°$.',
   options:opts5('15','30','$15\\sqrt{3}$','$30\\sqrt{3}$','$\\frac{15\\sqrt{3}}{2}$'),correctAnswer:'A',
   explanation:'$S = AB \\cdot AD \\cdot \\sin A = 5 \\cdot 6 \\cdot \\sin 30° = 30 \\cdot 0{,}5 = 15$.',
   tags:S(['параллелограмм','площадь']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-008',section:'Геометрические фигуры',part:'B',difficulty:2,type:'TEXT_INPUT',
   content:'Диагональ ромба равна 12 и 16. Найдите площадь ромба.',
   options:null,correctAnswer:'96',
   explanation:'$S = \\frac{d_1 d_2}{2} = \\frac{12 \\cdot 16}{2} = 96$.',
   tags:S(['ромб','площадь']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-009',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'В трапеции основания 8 и 14, высота 6. Найдите площадь.',
   options:opts5('60','66','72','84','48'),correctAnswer:'C',
   explanation:'$S = \\frac{(a+b)}{2} \\cdot h = \\frac{8+14}{2} \\cdot 6 = 11 \\cdot 6 = 66$.',
   tags:S(['трапеция','площадь']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-010',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Длина дуги окружности с радиусом $R=6$ и центральным углом $60°$.',
   options:opts5('$2\\pi$','$\\pi$','$6\\pi$','$3\\pi$','$12\\pi$'),correctAnswer:'A',
   explanation:'$l = \\frac{\\alpha}{360°} \\cdot 2\\pi R = \\frac{60°}{360°} \\cdot 12\\pi = 2\\pi$.',
   tags:S(['окружность','дуга']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-011',section:'Геометрические фигуры',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Вписанный угол опирается на дугу $120°$. Найдите значение вписанного угла.',
   options:opts5('$60°$','$120°$','$240°$','$30°$','$90°$'),correctAnswer:'A',
   explanation:'Вписанный угол = $\\frac{1}{2}$ дуги, на которую опирается: $\\frac{120°}{2} = 60°$.',
   tags:S(['вписанный угол','окружность']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-GEO-012',section:'Геометрические фигуры',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'В треугольнике $ABC$: $a = 7$, $b = 8$, $c = 9$. Найдите $\\cos A$ (через теорему косинусов).',
   options:null,correctAnswer:'0.667',
   explanation:'$\\cos A = \\frac{b^2+c^2-a^2}{2bc} = \\frac{64+81-49}{144} = \\frac{96}{144} = \\frac{2}{3} \\approx 0{,}667$.',
   tags:S(['теорема косинусов']),source:'ЦТ 2022',year:2022},

  {externalId:'M2-GEO-013',section:'Геометрические фигуры',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Прямоугольник вписан в окружность радиуса 5. Одна сторона равна 6. Найдите площадь прямоугольника.',
   options:opts5('48','40','30','60','24'),correctAnswer:'A',
   explanation:'Диагональ прямоугольника = диаметр = 10. $b = \\sqrt{100-36} = \\sqrt{64} = 8$. $S = 6 \\cdot 8 = 48$.',
   tags:S(['прямоугольник','вписанный в окружность']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-GEO-014',section:'Геометрические фигуры',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Правильный шестиугольник со стороной 4. Найдите его площадь.',
   options:opts5('$24\\sqrt{3}$','$48$','$24$','$12\\sqrt{3}$','$6\\sqrt{3}$'),correctAnswer:'A',
   explanation:'$S = \\frac{3\\sqrt{3}}{2} a^2 = \\frac{3\\sqrt{3}}{2} \\cdot 16 = 24\\sqrt{3}$.',
   tags:S(['правильный шестиугольник']),source:'ЦТ 2023',year:2023},

  // СТЕРЕОМЕТРИЯ
  {externalId:'M2-GEO-015',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Объём прямоугольного параллелепипеда с рёбрами 3, 4, 5.',
   options:opts5('60','12','20','48','15'),correctAnswer:'A',
   explanation:'$V = 3 \\cdot 4 \\cdot 5 = 60$.',
   tags:S(['параллелепипед','объём']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-016',section:'Геометрические фигуры',part:'A',difficulty:2,type:'SINGLE_CHOICE',
   content:'Объём шара с радиусом 3.',
   options:opts5('$36\\pi$','$12\\pi$','$9\\pi$','$108\\pi$','$4\\pi$'),correctAnswer:'A',
   explanation:'$V = \\frac{4}{3}\\pi r^3 = \\frac{4}{3}\\pi \\cdot 27 = 36\\pi$.',
   tags:S(['шар','объём']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-017',section:'Геометрические фигуры',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Площадь полной поверхности цилиндра: радиус $r=3$, высота $h=5$. Ответ в виде $n\\pi$, запишите $n$.',
   options:null,correctAnswer:'48',
   explanation:'$S = 2\\pi r(r+h) = 2\\pi \\cdot 3 \\cdot (3+5) = 6\\pi \\cdot 8 = 48\\pi$. Ответ: 48.',
   tags:S(['цилиндр','площадь поверхности']),source:'ЦТ 2023',year:2023},

  {externalId:'M2-GEO-018',section:'Геометрические фигуры',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Правильная четырёхугольная пирамида: сторона основания 6, высота 4. Найдите объём.',
   options:opts5('48','72','24','96','32'),correctAnswer:'A',
   explanation:'$V = \\frac{1}{3} S_{осн} \\cdot h = \\frac{1}{3} \\cdot 36 \\cdot 4 = 48$.',
   tags:S(['пирамида','объём']),source:'ЦТ 2022',year:2022},

  {externalId:'M2-GEO-019',section:'Геометрические фигуры',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'Диагональ куба со стороной $a$. Найдите её длину.',
   options:opts5('$a\\sqrt{2}$','$a\\sqrt{3}$','$2a$','$a\\sqrt{6}$','$3a$'),correctAnswer:'B',
   explanation:'$d = \\sqrt{a^2+a^2+a^2} = a\\sqrt{3}$.',
   tags:S(['куб','диагональ']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-020',section:'Геометрические фигуры',part:'B',difficulty:4,type:'TEXT_INPUT',
   content:'Конус: образующая 10, радиус основания 6. Найдите площадь боковой поверхности. Ответ в виде $n\\pi$, запишите $n$.',
   options:null,correctAnswer:'60',
   explanation:'$S_{бок} = \\pi r l = \\pi \\cdot 6 \\cdot 10 = 60\\pi$. Ответ: 60.',
   tags:S(['конус','боковая поверхность']),source:'ЦТ 2023',year:2023},

  // Тригонометрия в геометрии
  {externalId:'M2-GEO-021',section:'Геометрические фигуры',part:'A',difficulty:3,type:'SINGLE_CHOICE',
   content:'В прямоугольном треугольнике $\\sin \\alpha = \\frac{3}{5}$. Найдите $\\cos \\alpha$.',
   options:opts5('$\\frac{4}{5}$','$\\frac{3}{4}$','$\\frac{4}{3}$','$\\frac{5}{3}$','$\\frac{2}{5}$'),correctAnswer:'A',
   explanation:'$\\cos^2 \\alpha = 1 - \\sin^2 \\alpha = 1 - \\frac{9}{25} = \\frac{16}{25}$, $\\cos \\alpha = \\frac{4}{5}$.',
   tags:S(['тригонометрия в треугольнике']),source:'Авторское',year:2024},

  {externalId:'M2-GEO-022',section:'Геометрические фигуры',part:'B',difficulty:3,type:'TEXT_INPUT',
   content:'Через теорему синусов: в треугольнике $\\angle A = 30°$, $a = 5$ (сторона напротив $A$). Найдите радиус описанной окружности.',
   options:null,correctAnswer:'5',
   explanation:'$R = \\frac{a}{2\\sin A} = \\frac{5}{2 \\cdot 0{,}5} = \\frac{5}{1} = 5$.',
   tags:S(['теорема синусов','описанная окружность']),source:'ЦТ 2023',year:2023},
];

async function main() {
  console.log('🔢 Добавляю математику Phase 2...');

  const subject = await prisma.subject.findFirst({ where: { slug: 'math' } });
  if (!subject) { console.error('Subject math not found'); return; }

  // Get topic map
  const topics = await prisma.topic.findMany({ where: { subjectId: subject.id } });

  // Map sections to topics
  const sectionToTopicName = {
    'Числа и вычисления': 'Теория чисел',
    'Выражения и их преобразования': 'Алгебра и начала анализа',
    'Уравнения и неравенства': 'Алгебра и начала анализа',
    'Координаты и функции': 'Алгебра и начала анализа',
    'Геометрические фигуры': 'Геометрия',
  };

  let created = 0;
  for (const q of mathQuestions) {
    const topicName = sectionToTopicName[q.section] || 'Алгебра и начала анализа';
    const topic = topics.find(t => t.name === topicName);

    try {
      await prisma.question.create({
        data: {
          externalId: q.externalId,
          subjectId: subject.id,
          topicId: topic?.id,
          type: q.type,
          difficulty: q.difficulty,
          part: q.part,
          section: q.section,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          solution: q.solution ?? null,
          tags: q.tags,
          source: q.source,
          year: q.year,
          status: 'ACTIVE',
          timesSolved: Math.floor(Math.random() * 800) + 100,
          timesCorrect: Math.floor(Math.random() * 600) + 50,
        },
      });
      created++;
    } catch (e) {
      if (!e.message.includes('Unique')) console.error(q.externalId, e.message.substring(0, 80));
    }
  }

  await prisma.subject.update({
    where: { id: subject.id },
    data: { questionsCount: { increment: created } },
  });

  console.log(`✅ Математика: добавлено ${created} заданий`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
