# 🎓 CT-Platform: Архитектура платформы подготовки к ЦТ/ЦЭ

## 📋 Обзор проекта

**CT-Platform** — современная EdTech-платформа для подготовки к централизованному тестированию (ЦТ) и централизованным экзаменам (ЦЭ) в Республике Беларусь.

### Ключевые особенности
- 🧠 **Интеллектуальная система обучения** — адаптация под уровень ученика
- 📚 **Связь теории с практикой** — каждое задание связано с правилом/формулой
- 📊 **Детальная аналитика** — статистика по темам, слабым местам, прогрессу
- 🎯 **Режим реального экзамена** — таймер, паузы, автопроверка
- 💰 **Монетизация** — реклама + Premium-подписка

---

## 🏗 Стек технологий

### Frontend
| Технология | Назначение |
|------------|------------|
| **Next.js 15** | React-фреймворк с SSR/SSG |
| **TypeScript** | Типизация |
| **Tailwind CSS** | Стилизация |
| **shadcn/ui** | UI-компоненты |
| **TanStack Query** | Управление состоянием сервера |
| **Zustand** | Глобальное состояние |
| **Framer Motion** | Анимации |
| **Recharts** | Графики и диаграммы |

### Backend
| Технология | Назначение |
|------------|------------|
| **Next.js API Routes** | Backend API |
| **Prisma ORM** | Работа с БД |
| **NextAuth.js v5** | Аутентификация |
| **Zod** | Валидация |

### Database
| Технология | Назначение |
|------------|------------|
| **PostgreSQL** | Основная БД |
| **Redis** | Кэш, сессии, rate limiting |

### Infrastructure
| Технология | Назначение |
|------------|------------|
| **Vercel** | Хостинг |
| **Docker** | Контейнеризация |
| **GitHub Actions** | CI/CD |

---

## 📁 Структура проекта

```
ct-platform/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Группа маршрутов авторизации
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (main)/                   # Группа основных маршрутов
│   │   ├── page.tsx              # Главная страница
│   │   ├── subjects/
│   │   │   └── [slug]/           # Страница предмета
│   │   ├── practice/
│   │   │   └── [subjectId]/      # Режим практики по типам
│   │   ├── exam/
│   │   │   └── [subjectId]/      # Режим экзамена
│   │   ├── theory/
│   │   │   └── [subjectId]/      # Теория
│   │   ├── profile/
│   │   └── statistics/
│   ├── (admin)/                  # Админ-панель
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── questions/
│   │       ├── theory/
│   │       ├── users/
│   │       └── analytics/
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── questions/
│   │   ├── theory/
│   │   ├── practice/
│   │   ├── exam/
│   │   ├── statistics/
│   │   └── admin/
│   └── layout.tsx
├── components/                   # React компоненты
│   ├── ui/                       # Базовые UI (shadcn)
│   ├── common/                   # Общие компоненты
│   ├── question/                 # Компоненты заданий
│   ├── exam/                     # Компоненты экзамена
│   ├── theory/                   # Компоненты теории
│   ├── stats/                    # Компоненты статистики
│   └── admin/                    # Компоненты админки
├── lib/                          # Утилиты и конфигурация
│   ├── prisma.ts                 # Prisma клиент
│   ├── auth.ts                   # Auth.js конфиг
│   ├── utils.ts                  # Утилиты
│   └── constants.ts              # Константы
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript типы
├── prisma/
│   └── schema.prisma             # Схема БД
├── public/                       # Статические файлы
└── docs/                         # Документация
```

---

## 🗄 Структура базы данных

### Основные сущности

```prisma
// Пользователи
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Связи
  sessions      Session[]
  accounts      Account[]
  progress      UserProgress[]
  examAttempts  ExamAttempt[]
  favorites     Favorite[]
  subscriptions Subscription[]
}

// Предметы
model Subject {
  id          String   @id @default(cuid())
  slug        String   @unique  // math, russian, physics
  name        String            // Математика
  nameShort   String?           // Мат.
  description String?
  icon        String?           // Иконка
  color       String?           // Цвет темы
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  
  // Связи
  topics      Topic[]
  questions   Question[]
  examConfigs ExamConfig[]
}

// Темы предмета
model Topic {
  id          String   @id @default(cuid())
  subjectId   String
  name        String
  description String?
  order       Int      @default(0)
  
  // Связи
  subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  subtopics   Subtopic[]
  questions   Question[]
  theory      Theory[]
}

// Подтемы
model Subtopic {
  id          String   @id @default(cuid())
  topicId     String
  name        String
  description String?
  order       Int      @default(0)
  
  // Связи
  topic       Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  questions   Question[]
  theory      Theory[]
}

// Задания
model Question {
  id              String       @id @default(cuid())
  externalId      String?      @unique  // Внешний ID (A1, B2 и т.д.)
  
  // Связи
  subjectId       String
  topicId         String?
  subtopicId      String?
  
  // Контент
  type            QuestionType
  difficulty      Int          @default(1)  // 1-5
  content         String       // Условие (Markdown)
  options         Json?        // Варианты ответов
  correctAnswer   String       // Правильный ответ
  explanation     String       // Пояснение (Markdown)
  solution        String?      // Пошаговое решение
  
  // Метаданные
  tags            String[]
  year            Int?         // Год из сборника
  source          String?      // Источник
  
  // Связь с теорией
  relatedTheory   Theory?      @relation(fields: [relatedTheoryId], references: [id])
  relatedTheoryId String?
  
  // Статистика
  timesSolved     Int          @default(0)
  timesCorrect    Int          @default(0)
  avgTimeSeconds  Int?         // Среднее время решения
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  // Связи
  subject         Subject      @relation(fields: [subjectId], references: [id])
  topic           Topic?       @relation(fields: [topicId], references: [id])
  subtopic        Subtopic?    @relation(fields: [subtopicId], references: [id])
  progress        UserProgress[]
  examQuestions   ExamQuestion[]
  favorites       Favorite[]
}

// Теория
model Theory {
  id          String   @id @default(cuid())
  
  // Связи
  subjectId   String
  topicId     String?
  subtopicId  String?
  
  // Контент
  title       String
  content     String   // Markdown
  formulas    Json?    // Формулы
  examples    Json?    // Примеры
  
  // Метаданные
  order       Int      @default(0)
  tags        String[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Связи
  subject     Subject  @relation(fields: [subjectId], references: [id])
  topic       Topic?   @relation(fields: [topicId], references: [id])
  subtopic    Subtopic? @relation(fields: [subtopicId], references: [id])
  questions   Question[]
}

// Прогресс пользователя
model UserProgress {
  id              String   @id @default(cuid())
  userId          String
  questionId      String
  
  // Результат
  isCorrect       Boolean
  userAnswer      String
  timeSpent       Int      // В секундах
  
  // Метаданные
  attemptNumber   Int      @default(1)
  sessionId       String?  // ID сессии практики
  
  createdAt       DateTime @default(now())
  
  // Связи
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question        Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  
  @@unique([userId, questionId, attemptNumber])
}

// Попытки экзамена
model ExamAttempt {
  id              String   @id @default(cuid())
  userId          String
  subjectId       String
  
  // Результаты
  score           Int      // Первичные баллы
  maxScore        Int
  percentage      Float
  grade           Int?     // Оценка по шкале ЦТ
  
  // Время
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  totalTime       Int      // В секундах
  
  // Метаданные
  isCompleted     Boolean  @default(false)
  
  // Связи
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions       ExamQuestion[]
}

// Вопросы в экзамене
model ExamQuestion {
  id              String   @id @default(cuid())
  examAttemptId   String
  questionId      String
  
  // Порядок и ответ
  order           Int
  userAnswer      String?
  isCorrect       Boolean?
  timeSpent       Int?
  
  // Связи
  examAttempt     ExamAttempt @relation(fields: [examAttemptId], references: [id], onDelete: Cascade)
  question        Question    @relation(fields: [questionId], references: [id])
}

// Избранные задания
model Favorite {
  id          String   @id @default(cuid())
  userId      String
  questionId  String
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  
  @@unique([userId, questionId])
}

// Конфигурация экзамена по предмету
model ExamConfig {
  id              String   @id @default(cuid())
  subjectId       String
  
  // Параметры экзамена
  durationMinutes Int      // Длительность
  totalQuestions  Int      // Количество вопросов
  passingScore    Int      // Проходной балл
  
  // Структура (JSON)
  structure       Json     // [{type: "A", count: 10, points: 1}, ...]
  
  subject         Subject  @relation(fields: [subjectId], references: [id])
}

// Подписки (Premium)
model Subscription {
  id          String   @id @default(cuid())
  userId      String
  plan        PlanType
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Enum типы
enum UserRole {
  USER
  ADMIN
  MODERATOR
}

enum QuestionType {
  SINGLE_CHOICE    // Один правильный ответ (A-задания)
  MULTIPLE_CHOICE  // Несколько правильных (B-задания)
  TEXT_INPUT       // Текстовый ответ (C-задания)
  MATCHING         // Сопоставление
  ORDERING         // Упорядочивание
}

enum PlanType {
  FREE
  PREMIUM_MONTHLY
  PREMIUM_YEARLY
}
```

---

## 🔐 Система авторизации

### NextAuth.js v5 (Auth.js) с провайдерами:
- **Credentials** — email + password
- **Google** — OAuth
- **VK** — OAuth (популярно в РБ)

### Роли пользователей:
- `USER` — обычный пользователь
- `PREMIUM` — платная подписка
- `MODERATOR` — модератор контента
- `ADMIN` — полный доступ

---

## 📊 Умные функции

### 1. Адаптивная сложность
```typescript
// Алгоритм выбора следующего задания
function getNextQuestion(userId: string, topicId: string) {
  const stats = getUserTopicStats(userId, topicId);
  
  if (stats.accuracy < 0.4) {
    // Низкая точность → легкие задания
    return getQuestions(topicId, { difficulty: 1 });
  } else if (stats.accuracy < 0.7) {
    // Средняя точность → средние задания
    return getQuestions(topicId, { difficulty: 2 });
  } else {
    // Высокая точность → сложные задания
    return getQuestions(topicId, { difficulty: { gte: 3 } });
  }
}
```

### 2. Статистика по слабым темам
- Анализ ошибок по темам
- Расчёт процента правильных ответов
- Рекомендации для изучения

### 3. Режим повторения ошибок
- Фильтр заданий с `isCorrect = false`
- Приоритет частых ошибок
- Интервальное повторение

### 4. Рейтинг сложности
- На основе статистики всех пользователей
- Формула: `difficulty = 1 - (correct / total)`

---

## 💰 Монетизация

### Реклама (бесплатный уровень)
- Google AdSense
- Яндекс.Директ
- **Правила размещения:**
  - Не мешать решению заданий
  - Только в боковых панелях и между блоками
  - Нет pop-up и перекрывающей рекламы

### Premium-подписка
| Функция | Free | Premium |
|---------|------|---------|
| Базовые задания | ✅ | ✅ |
| Режим экзамена | 3/месяц | Безлимит |
| Подробные разборы | ❌ | ✅ |
| Реклама | ✅ | ❌ |
| Статистика | Базовая | Расширенная |
| Избранное | 50 | Безлимит |
| Экспорт прогресса | ❌ | ✅ |

---

## 🚀 План разработки

### Фаза 1: MVP (4-6 недель)
- [x] Архитектура и дизайн
- [ ] Базовый фронтенд (Next.js + Tailwind)
- [ ] База данных (PostgreSQL + Prisma)
- [ ] Авторизация
- [ ] 1 предмет (Математика) — 50 заданий
- [ ] Режим практики по типам
- [ ] Базовая статистика

### Фаза 2: Core (4-6 недель)
- [ ] Все предметы (10+)
- [ ] Режим экзамена с таймером
- [ ] Раздел теории
- [ ] Адаптивная сложность
- [ ] Админ-панель
- [ ] Рекламная интеграция

### Фаза 3: Умные функции (4 недели)
- [ ] AI-рекомендации
- [ ] Режим повторения ошибок
- [ ] Расширенная аналитика
- [ ] Premium-подписка
- [ ] Мобильное приложение (PWA)

### Фаза 4: Масштабирование (ongoing)
- [ ] Performance optimization
- [ ] SEO
- [ ] Контент-маркетинг
- [ ] Партнёрства

---

## 📈 Метрики успеха

### Технические
- Time to First Byte (TTFB) < 200ms
- Lighthouse Score > 90
- Uptime > 99.9%

### Продуктовые
- DAU/MAU > 30%
- Среднее время сессии > 15 мин
- Retention (7 дней) > 40%

### Бизнес
- 1000+ активных пользователей (месяц 3)
- 10,000+ (месяц 6)
- 5% конверсия в Premium

---

## 🔧 Установка и запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/yourusername/ct-platform.git
cd ct-platform

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env.local
# Отредактировать .env.local

# 4. Инициализировать БД
npx prisma migrate dev
npx prisma db seed

# 5. Запустить dev-сервер
npm run dev
```

---

## 📚 Дополнительная документация

- [DATABASE.md](./DATABASE.md) — Подробная схема БД
- [API.md](./API.md) — API endpoints
- [UI.md](./UI.md) — Дизайн-система
- [DEPLOY.md](./DEPLOY.md) — Деплой
