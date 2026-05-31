// Supplemental seed for subjects without questions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const extraQuestions = {
  english: {
    'Grammar': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Choose the correct form: She ___ to school every day.',
        options: JSON.stringify([
          { id: 'A', text: 'go' }, { id: 'B', text: 'goes' }, { id: 'C', text: 'going' }, { id: 'D', text: 'gone' }
        ]),
        correctAnswer: 'B',
        explanation: 'With third person singular (she/he/it), we add -s to the verb in Present Simple: "goes".',
        tags: JSON.stringify(['present simple', 'grammar']),
        externalId: 'EN-GR-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Choose the correct form: If I ___ rich, I would travel the world.',
        options: JSON.stringify([
          { id: 'A', text: 'am' }, { id: 'B', text: 'was' }, { id: 'C', text: 'were' }, { id: 'D', text: 'be' }
        ]),
        correctAnswer: 'C',
        explanation: 'In second conditional (unreal present), we use "were" for all persons: "If I were rich..."',
        tags: JSON.stringify(['conditionals', 'second conditional']),
        externalId: 'EN-GR-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Choose the correct tense: By the time she arrived, we ___ dinner.',
        options: JSON.stringify([
          { id: 'A', text: 'finished' }, { id: 'B', text: 'have finished' }, { id: 'C', text: 'had finished' }, { id: 'D', text: 'finish' }
        ]),
        correctAnswer: 'C',
        explanation: 'Past Perfect is used for an action completed before another past action: "had finished".',
        tags: JSON.stringify(['past perfect', 'tenses']),
        externalId: 'EN-GR-003',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Choose the correct modal: You ___ wear a seatbelt. It\'s the law.',
        options: JSON.stringify([
          { id: 'A', text: 'can' }, { id: 'B', text: 'might' }, { id: 'C', text: 'must' }, { id: 'D', text: 'would' }
        ]),
        correctAnswer: 'C',
        explanation: '"Must" expresses obligation or necessity, especially from external rules or laws.',
        tags: JSON.stringify(['modal verbs', 'obligation']),
        externalId: 'EN-GR-004',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 3,
        content: 'Choose the correct passive form: The letter ___ yesterday.',
        options: JSON.stringify([
          { id: 'A', text: 'was written' }, { id: 'B', text: 'wrote' }, { id: 'C', text: 'is written' }, { id: 'D', text: 'has written' }
        ]),
        correctAnswer: 'A',
        explanation: 'Past Simple Passive = was/were + past participle. "was written" for a past event.',
        tags: JSON.stringify(['passive voice', 'past simple passive']),
        externalId: 'EN-GR-005',
      },
    ],
    'Vocabulary': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Choose the correct word: The opposite of "ancient" is ___.',
        options: JSON.stringify([
          { id: 'A', text: 'modern' }, { id: 'B', text: 'old' }, { id: 'C', text: 'historic' }, { id: 'D', text: 'antique' }
        ]),
        correctAnswer: 'A',
        explanation: '"Ancient" means very old. Its opposite is "modern" (contemporary, new).',
        tags: JSON.stringify(['antonyms', 'vocabulary']),
        externalId: 'EN-VOC-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Which word means "to make something better"?',
        options: JSON.stringify([
          { id: 'A', text: 'deteriorate' }, { id: 'B', text: 'improve' }, { id: 'C', text: 'maintain' }, { id: 'D', text: 'reduce' }
        ]),
        correctAnswer: 'B',
        explanation: '"Improve" means to make something better or of higher quality.',
        tags: JSON.stringify(['vocabulary', 'word meaning']),
        externalId: 'EN-VOC-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Choose the correct word form: She made a significant ___ to science.',
        options: JSON.stringify([
          { id: 'A', text: 'contribute' }, { id: 'B', text: 'contributing' }, { id: 'C', text: 'contribution' }, { id: 'D', text: 'contributed' }
        ]),
        correctAnswer: 'C',
        explanation: 'After "a/an/the", we need a noun: "contribution" (noun form of "contribute").',
        tags: JSON.stringify(['word formation', 'nouns']),
        externalId: 'EN-VOC-003',
      },
    ],
    'Reading Comprehension': [
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Read: "Despite the heavy rain, the students decided to go on a field trip." What does "despite" mean?',
        options: JSON.stringify([
          { id: 'A', text: 'Because of' }, { id: 'B', text: 'Without' }, { id: 'C', text: 'Although there was' }, { id: 'D', text: 'After' }
        ]),
        correctAnswer: 'C',
        explanation: '"Despite" is a preposition meaning "in spite of" or "although". It introduces a contrasting element.',
        tags: JSON.stringify(['reading', 'conjunctions']),
        externalId: 'EN-READ-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Which sentence is grammatically correct?',
        options: JSON.stringify([
          { id: 'A', text: 'There is many students in the class.' },
          { id: 'B', text: 'There are many students in the class.' },
          { id: 'C', text: 'There are many student in the class.' },
          { id: 'D', text: 'There is many student in the class.' }
        ]),
        correctAnswer: 'B',
        explanation: '"Students" is plural, so we use "are". "Many" is used with countable nouns.',
        tags: JSON.stringify(['subject-verb agreement', 'grammar']),
        externalId: 'EN-READ-002',
      },
    ],
  },

  belarusian: {
    'Арфаграфія': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Знайдзіце слова з літарай "і":',
        options: JSON.stringify([
          { id: 'A', text: 'дзень' }, { id: 'B', text: 'лі́па' }, { id: 'C', text: 'вясна' }, { id: 'D', text: 'зіма' }
        ]),
        correctAnswer: 'D',
        explanation: '"Зіма" — у беларускай мове ва ўсіх ненаціскных складах пасля цвёрдых зычных пішацца "і".',
        tags: JSON.stringify(['арфаграфія', 'галосныя']),
        externalId: 'BY-ORTH-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'У якім слове пішацца "дз"?',
        options: JSON.stringify([
          { id: 'A', text: 'до\'шчык' }, { id: 'B', text: 'дзядуля' }, { id: 'C', text: 'дарога' }, { id: 'D', text: 'думка' }
        ]),
        correctAnswer: 'B',
        explanation: '"Дзядуля" — дзеканне: [д\'] перад [е, я, і, ю] перадаецца як "дз".',
        tags: JSON.stringify(['дзеканне', 'зычныя']),
        externalId: 'BY-ORTH-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Выберыце правільны варыянт напісання:',
        options: JSON.stringify([
          { id: 'A', text: 'малако' }, { id: 'B', text: 'молоко' }, { id: 'C', text: 'малака' }, { id: 'D', text: 'малоко' }
        ]),
        correctAnswer: 'A',
        explanation: 'У беларускай мове аканне: ненаціскное "о" перадаецца як "а". Правільна: "малако".',
        tags: JSON.stringify(['аканне', 'арфаграфія']),
        externalId: 'BY-ORTH-003',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Знайдзіце слова з апострафам:',
        options: JSON.stringify([
          { id: 'A', text: 'паветра' }, { id: 'B', text: 'аб\'яднанне' }, { id: 'C', text: 'мядзведзь' }, { id: 'D', text: 'кветка' }
        ]),
        correctAnswer: 'B',
        explanation: 'Апостраф пішацца пасля прыставак перад галоснымі е, ё, ю, я: аб\'яднанне.',
        tags: JSON.stringify(['апостраф', 'правапіс']),
        externalId: 'BY-ORTH-004',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 3,
        content: 'У якім слове пішацца "ў"?',
        options: JSON.stringify([
          { id: 'A', text: 'у_ лесе' }, { id: 'B', text: 'аў_тобус' }, { id: 'C', text: 'пайшо_' }, { id: 'D', text: 'у_рок' }
        ]),
        correctAnswer: 'C',
        explanation: '"Ў" (нескладовае у) пішацца ў сярэдзіне слова пасля галоснай: "пайшоў".',
        tags: JSON.stringify(['нескладовае у', 'ў']),
        externalId: 'BY-ORTH-005',
      },
    ],
    'Марфалогія': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Да якой часціны мовы адносіцца слова "красавік"?',
        options: JSON.stringify([
          { id: 'A', text: 'Прыметнік' }, { id: 'B', text: 'Назоўнік' }, { id: 'C', text: 'Дзеяслоў' }, { id: 'D', text: 'Прыслоўе' }
        ]),
        correctAnswer: 'B',
        explanation: '"Красавік" (апрель) — назоўнік, мужчынскага роду, абазначае назву месяца.',
        tags: JSON.stringify(['назоўнік', 'марфалогія']),
        externalId: 'BY-MORPH-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Вызначце форму дзеяслова "чытаюць":',
        options: JSON.stringify([
          { id: 'A', text: '1-я асоба, адзіночны лік' },
          { id: 'B', text: '3-я асоба, множны лік' },
          { id: 'C', text: '2-я асоба, адзіночны лік' },
          { id: 'D', text: '1-я асоба, множны лік' }
        ]),
        correctAnswer: 'B',
        explanation: '"Чытаюць" — 3-я асоба, множны лік, цяперашні час: яны чытаюць.',
        tags: JSON.stringify(['дзеяслоў', 'асоба']),
        externalId: 'BY-MORPH-002',
      },
    ],
    'Сінтаксіс': [
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Вызначце від сказа: "Калі прыйшла вясна, расцвілі сады."',
        options: JSON.stringify([
          { id: 'A', text: 'Просты' }, { id: 'B', text: 'Складаназлучаны' }, { id: 'C', text: 'Складаназалежны' }, { id: 'D', text: 'Бяззлучнікавы' }
        ]),
        correctAnswer: 'C',
        explanation: 'Складаназалежны сказ: галоўная частка "расцвілі сады" і даданая "калі прыйшла вясна", звязаныя злучнікам "калі".',
        tags: JSON.stringify(['складаназалежны сказ', 'сінтаксіс']),
        externalId: 'BY-SYNT-001',
      },
    ],
  },

  'world-history': {
    'Древний мир': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Где возникла первая известная письменность?',
        options: JSON.stringify([
          { id: 'A', text: 'В Греции' }, { id: 'B', text: 'В Месопотамии (шумеры)' }, { id: 'C', text: 'В Китае' }, { id: 'D', text: 'В Египте' }
        ]),
        correctAnswer: 'B',
        explanation: 'Клинописное письмо шумеров в Месопотамии (современный Ирак) — одна из первых известных форм письменности (~3500 до н.э.).',
        tags: JSON.stringify(['письменность', 'Месопотамия']),
        externalId: 'WH-ANC-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Кто написал «Илиаду» и «Одиссею»?',
        options: JSON.stringify([
          { id: 'A', text: 'Аристотель' }, { id: 'B', text: 'Гомер' }, { id: 'C', text: 'Геродот' }, { id: 'D', text: 'Платон' }
        ]),
        correctAnswer: 'B',
        explanation: 'Гомер — легендарный древнегреческий поэт, автор эпических поэм «Илиада» и «Одиссея».',
        tags: JSON.stringify(['Греция', 'литература']),
        externalId: 'WH-ANC-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Когда пала Западная Римская империя?',
        options: JSON.stringify([
          { id: 'A', text: '410 г. н.э.' }, { id: 'B', text: '476 г. н.э.' }, { id: 'C', text: '395 г. н.э.' }, { id: 'D', text: '500 г. н.э.' }
        ]),
        correctAnswer: 'B',
        explanation: 'Западная Римская империя пала в 476 году н.э., когда германский вождь Одоакр сверг последнего императора Ромула Августула.',
        tags: JSON.stringify(['Рим', 'падение Рима']),
        externalId: 'WH-ANC-003',
      },
    ],
    'Средневековье': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'В каком году произошла Великая схизма — раздел христианской церкви на католическую и православную?',
        options: JSON.stringify([
          { id: 'A', text: '1054' }, { id: 'B', text: '1096' }, { id: 'C', text: '800' }, { id: 'D', text: '1204' }
        ]),
        correctAnswer: 'A',
        explanation: 'Великая схизма 1054 года разделила единую христианскую церковь на Римско-католическую и Православную.',
        tags: JSON.stringify(['церковь', 'схизма']),
        externalId: 'WH-MED-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Кто из правителей был коронован как «Карл Великий» в 800 году?',
        options: JSON.stringify([
          { id: 'A', text: 'Карл Мартелл' }, { id: 'B', text: 'Пипин Короткий' }, { id: 'C', text: 'Карл Великий (Charlemagne)' }, { id: 'D', text: 'Хлодвиг' }
        ]),
        correctAnswer: 'C',
        explanation: 'Карл Великий (Charlemagne) был коронован Папой Римским в 800 г. и объединил большую часть Западной Европы.',
        tags: JSON.stringify(['Карл Великий', 'Франкская империя']),
        externalId: 'WH-MED-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Когда началась Столетняя война между Англией и Францией?',
        options: JSON.stringify([
          { id: 'A', text: '1337' }, { id: 'B', text: '1215' }, { id: 'C', text: '1453' }, { id: 'D', text: '1300' }
        ]),
        correctAnswer: 'A',
        explanation: 'Столетняя война (1337–1453) — серия конфликтов между Англией и Францией за французский трон.',
        tags: JSON.stringify(['Столетняя война', 'средневековье']),
        externalId: 'WH-MED-003',
      },
    ],
    'Новое время': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'В каком году Мартин Лютер опубликовал свои 95 тезисов, положив начало Реформации?',
        options: JSON.stringify([
          { id: 'A', text: '1492' }, { id: 'B', text: '1517' }, { id: 'C', text: '1534' }, { id: 'D', text: '1555' }
        ]),
        correctAnswer: 'B',
        explanation: 'В 1517 году Мартин Лютер опубликовал 95 тезисов против торговли индульгенциями, что дало начало Реформации.',
        tags: JSON.stringify(['Реформация', 'Лютер']),
        externalId: 'WH-NEW-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'В каком году произошла Великая Французская революция?',
        options: JSON.stringify([
          { id: 'A', text: '1776' }, { id: 'B', text: '1789' }, { id: 'C', text: '1799' }, { id: 'D', text: '1815' }
        ]),
        correctAnswer: 'B',
        explanation: 'Великая Французская революция началась в 1789 году взятием Бастилии и ознаменовала конец Старого порядка.',
        tags: JSON.stringify(['Французская революция', 'Новое время']),
        externalId: 'WH-NEW-002',
      },
    ],
    'Новейшее время': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'В каком году началась Первая мировая война?',
        options: JSON.stringify([
          { id: 'A', text: '1918' }, { id: 'B', text: '1914' }, { id: 'C', text: '1939' }, { id: 'D', text: '1912' }
        ]),
        correctAnswer: 'B',
        explanation: 'Первая мировая война началась в 1914 году после убийства эрцгерцога Франца Фердинанда в Сараево.',
        tags: JSON.stringify(['Первая мировая война']),
        externalId: 'WH-MOD-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Когда была основана Организация Объединённых Наций (ООН)?',
        options: JSON.stringify([
          { id: 'A', text: '1945' }, { id: 'B', text: '1919' }, { id: 'C', text: '1946' }, { id: 'D', text: '1941' }
        ]),
        correctAnswer: 'A',
        explanation: 'ООН основана в 1945 году после окончания Второй мировой войны для поддержания международного мира.',
        tags: JSON.stringify(['ООН', 'международные организации']),
        externalId: 'WH-MOD-002',
      },
    ],
  },

  'social-studies': {
    'Государство и право': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Что является Основным законом Республики Беларусь?',
        options: JSON.stringify([
          { id: 'A', text: 'Гражданский кодекс' }, { id: 'B', text: 'Конституция' }, { id: 'C', text: 'Декрет Президента' }, { id: 'D', text: 'Уголовный кодекс' }
        ]),
        correctAnswer: 'B',
        explanation: 'Конституция Республики Беларусь — Основной закон государства, обладающий высшей юридической силой.',
        tags: JSON.stringify(['Конституция', 'право']),
        externalId: 'SS-LAW-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'С какого возраста наступает полная гражданская дееспособность в Беларуси?',
        options: JSON.stringify([
          { id: 'A', text: '14 лет' }, { id: 'B', text: '16 лет' }, { id: 'C', text: '18 лет' }, { id: 'D', text: '21 год' }
        ]),
        correctAnswer: 'C',
        explanation: 'Полная гражданская дееспособность наступает с 18 лет (совершеннолетие).',
        tags: JSON.stringify(['дееспособность', 'гражданское право']),
        externalId: 'SS-LAW-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Какой принцип означает, что все граждане равны перед законом?',
        options: JSON.stringify([
          { id: 'A', text: 'Принцип разделения властей' }, { id: 'B', text: 'Принцип равноправия' }, { id: 'C', text: 'Принцип демократизма' }, { id: 'D', text: 'Принцип гуманизма' }
        ]),
        correctAnswer: 'B',
        explanation: 'Принцип равноправия — все граждане имеют равные права и равны перед законом.',
        tags: JSON.stringify(['принципы права', 'равноправие']),
        externalId: 'SS-LAW-003',
      },
    ],
    'Экономика': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Что такое ВВП?',
        options: JSON.stringify([
          { id: 'A', text: 'Внешние Валютные Платежи' },
          { id: 'B', text: 'Валовой Внутренний Продукт — стоимость всех товаров и услуг, произведённых в стране за год' },
          { id: 'C', text: 'Внутренний Валютный Показатель' },
          { id: 'D', text: 'Взаимный Внешний Платёж' }
        ]),
        correctAnswer: 'B',
        explanation: 'ВВП (Валовой Внутренний Продукт) — рыночная стоимость всех конечных товаров и услуг, произведённых в стране за определённый период.',
        tags: JSON.stringify(['ВВП', 'макроэкономика']),
        externalId: 'SS-ECO-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Что такое инфляция?',
        options: JSON.stringify([
          { id: 'A', text: 'Рост объёмов производства' }, { id: 'B', text: 'Устойчивый рост общего уровня цен' }, { id: 'C', text: 'Снижение курса доллара' }, { id: 'D', text: 'Рост доходов населения' }
        ]),
        correctAnswer: 'B',
        explanation: 'Инфляция — устойчивый общий рост уровня цен в экономике, ведущий к снижению покупательной способности денег.',
        tags: JSON.stringify(['инфляция', 'денежная политика']),
        externalId: 'SS-ECO-002',
      },
    ],
    'Общество': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Что такое социализация?',
        options: JSON.stringify([
          { id: 'A', text: 'Процесс усвоения индивидом социального опыта и норм' }, { id: 'B', text: 'Национализация предприятий' }, { id: 'C', text: 'Форма государственного устройства' }, { id: 'D', text: 'Тип экономической системы' }
        ]),
        correctAnswer: 'A',
        explanation: 'Социализация — процесс, посредством которого человек усваивает нормы, ценности и образцы поведения общества.',
        tags: JSON.stringify(['социализация', 'социология']),
        externalId: 'SS-SOC-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Как называется форма государственного устройства, при которой власть принадлежит народу?',
        options: JSON.stringify([
          { id: 'A', text: 'Монархия' }, { id: 'B', text: 'Демократия' }, { id: 'C', text: 'Олигархия' }, { id: 'D', text: 'Теократия' }
        ]),
        correctAnswer: 'B',
        explanation: 'Демократия (от греч. demos — народ, kratos — власть) — форма правления, при которой источником власти является народ.',
        tags: JSON.stringify(['демократия', 'политическая система']),
        externalId: 'SS-SOC-002',
      },
    ],
  },

  geography: {
    'Физическая география Беларуси': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Какая река является главной водной артерией Беларуси?',
        options: JSON.stringify([
          { id: 'A', text: 'Припять' }, { id: 'B', text: 'Неман' }, { id: 'C', text: 'Днепр' }, { id: 'D', text: 'Западная Двина' }
        ]),
        correctAnswer: 'C',
        explanation: 'Днепр — крупнейшая река Беларуси, протекает через Могилёв, Жлобин, впадает в Чёрное море.',
        tags: JSON.stringify(['реки Беларуси', 'Днепр']),
        externalId: 'GEO-BY-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Где расположена самая высокая точка Беларуси — гора Дзержинская?',
        options: JSON.stringify([
          { id: 'A', text: 'Брестская область' }, { id: 'B', text: 'Витебская область' }, { id: 'C', text: 'Минская область' }, { id: 'D', text: 'Гродненская область' }
        ]),
        correctAnswer: 'C',
        explanation: 'Гора Дзержинская (345 м) — высшая точка Беларуси, расположена в Минской области.',
        tags: JSON.stringify(['рельеф', 'Беларусь']),
        externalId: 'GEO-BY-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Какое озеро является самым большим в Беларуси?',
        options: JSON.stringify([
          { id: 'A', text: 'Нарочь' }, { id: 'B', text: 'Свитязь' }, { id: 'C', text: 'Освейское' }, { id: 'D', text: 'Снуды' }
        ]),
        correctAnswer: 'A',
        explanation: 'Озеро Нарочь (площадь ~80 км²) — крупнейшее озеро Беларуси, расположено в Минской области.',
        tags: JSON.stringify(['озёра', 'Нарочь']),
        externalId: 'GEO-BY-003',
      },
    ],
    'Экономическая география': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Столица Республики Беларусь:',
        options: JSON.stringify([
          { id: 'A', text: 'Брест' }, { id: 'B', text: 'Гомель' }, { id: 'C', text: 'Минск' }, { id: 'D', text: 'Витебск' }
        ]),
        correctAnswer: 'C',
        explanation: 'Минск — столица и крупнейший город Республики Беларусь, центр Минской области.',
        tags: JSON.stringify(['столица', 'административное деление']),
        externalId: 'GEO-ECO-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Сколько областей в Республике Беларусь?',
        options: JSON.stringify([
          { id: 'A', text: '4' }, { id: 'B', text: '5' }, { id: 'C', text: '6' }, { id: 'D', text: '7' }
        ]),
        correctAnswer: 'C',
        explanation: 'Беларусь делится на 6 областей: Брестская, Витебская, Гомельская, Гродненская, Минская, Могилёвская, и город Минск как отдельная административная единица.',
        tags: JSON.stringify(['административное деление', 'области']),
        externalId: 'GEO-ECO-002',
      },
    ],
    'Мировая география': [
      {
        type: 'SINGLE_CHOICE', difficulty: 1,
        content: 'Какой континент является самым большим по площади?',
        options: JSON.stringify([
          { id: 'A', text: 'Африка' }, { id: 'B', text: 'Северная Америка' }, { id: 'C', text: 'Азия' }, { id: 'D', text: 'Южная Америка' }
        ]),
        correctAnswer: 'C',
        explanation: 'Азия — крупнейший материк площадью ~44,6 млн км² (около 30% суши Земли).',
        tags: JSON.stringify(['материки', 'площадь']),
        externalId: 'GEO-WORLD-001',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 2,
        content: 'Какая река является самой длинной в мире?',
        options: JSON.stringify([
          { id: 'A', text: 'Амазонка' }, { id: 'B', text: 'Янцзы' }, { id: 'C', text: 'Нил' }, { id: 'D', text: 'Миссисипи' }
        ]),
        correctAnswer: 'C',
        explanation: 'Нил (Африка) — самая длинная река мира (~6650 км), протекает через 11 государств.',
        tags: JSON.stringify(['реки мира', 'Нил']),
        externalId: 'GEO-WORLD-002',
      },
      {
        type: 'SINGLE_CHOICE', difficulty: 3,
        content: 'Какое государство занимает первое место в мире по площади территории?',
        options: JSON.stringify([
          { id: 'A', text: 'Канада' }, { id: 'B', text: 'США' }, { id: 'C', text: 'Китай' }, { id: 'D', text: 'Россия' }
        ]),
        correctAnswer: 'D',
        explanation: 'Россия — крупнейшее государство мира площадью ~17,1 млн км², что составляет 11% суши Земли.',
        tags: JSON.stringify(['страны мира', 'площадь']),
        externalId: 'GEO-WORLD-003',
      },
    ],
  },
};

async function main() {
  console.log('🌱 Добавляю вопросы для оставшихся предметов...');

  for (const [subjectSlug, topicsMap] of Object.entries(extraQuestions)) {
    const subject = await prisma.subject.findFirst({ where: { slug: subjectSlug } });
    if (!subject) { console.log(`⚠️  Предмет ${subjectSlug} не найден`); continue; }

    let count = 0;
    for (const [topicName, questions] of Object.entries(topicsMap)) {
      const topic = await prisma.topic.findFirst({ where: { subjectId: subject.id, name: topicName } });
      if (!topic) { console.log(`⚠️  Тема "${topicName}" не найдена в ${subjectSlug}`); continue; }

      for (const q of questions) {
        try {
          await prisma.question.create({
            data: {
              ...q,
              subjectId: subject.id,
              topicId: topic.id,
              status: 'ACTIVE',
              timesSolved: Math.floor(Math.random() * 300) + 30,
              timesCorrect: Math.floor(Math.random() * 200) + 10,
            },
          });
          count++;
        } catch (e) {
          if (!e.message.includes('Unique constraint')) console.error('Error:', e.message);
        }
      }
    }

    await prisma.subject.update({
      where: { id: subject.id },
      data: { questionsCount: { increment: count } },
    });
    console.log(`✅ ${subject.name}: добавлено ${count} заданий`);
  }

  console.log('\n🎉 Дополнительный контент добавлен!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
