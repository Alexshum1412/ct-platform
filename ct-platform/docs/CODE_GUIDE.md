# 📖 Руководство по коду CT-Platform

## Общая структура проекта

```
ct-platform/
├── app/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/           # React компоненты
│   │   │   ├── ui/              # shadcn/ui компоненты
│   │   │   ├── layout/          # Layout компоненты (Header, etc.)
│   │   │   ├── subject/         # Компоненты предметов
│   │   │   ├── question/        # Компоненты заданий
│   │   │   ├── exam/            # Компоненты экзамена
│   │   │   └── stats/           # Компоненты статистики
│   │   ├── pages/               # Страницы приложения
│   │   ├── sections/            # Секции главной страницы
│   │   ├── store/               # Zustand store
│   │   ├── data/                # Мок-данные
│   │   ├── types/               # TypeScript типы
│   │   └── hooks/               # Custom React hooks
│   └── ...
├── backend/                      # Backend (Next.js API)
│   ├── app/api/                 # API routes
│   ├── lib/                     # Утилиты
│   ├── prisma/                  # Схема БД
│   └── ...
└── docs/                         # Документация
```

---

## Frontend Архитектура

### 1. Компоненты

#### SubjectCard (`components/subject/SubjectCard.tsx`)
```tsx
// Отображает карточку предмета
interface SubjectCardProps {
  subject: Subject;      // Данные предмета
  index: number;         // Для анимации
  onClick?: () => void;  // Обработчик клика
}
```

#### QuestionCard (`components/question/QuestionCard.tsx`)
```tsx
// Карточка задания с подсказками
interface QuestionCardProps {
  question: Question;
  onAnswer?: (answer: string) => void;
  onShowTheory?: () => void;
  onNext?: () => void;
  onReport?: () => void;  // Пожаловаться на задание
}
```

### 2. Store (Zustand)

```tsx
// Основной store приложения
const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      // User
      user: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      // Gamification
      gamification: { level: 1, xp: 0, ... },
      addXp: (amount) => { ... },
      unlockAchievement: (id) => { ... },
      
      // ... другие методы
    }),
    { name: 'ct-platform-storage' }
  )
);
```

### 3. Типы данных

```tsx
// Предмет
interface Subject {
  id: string;
  slug: string;        // URL-friendly ID (math, russian, etc.)
  name: string;
  nameShort?: string;  // Короткое название
  description: string;
  icon: string;        // Lucide icon name
  color: string;       // CSS color
  gradient: string;    // CSS gradient class
  stats: {
    questionsCount: number;
    topicsCount: number;
    rating: number;
  };
}

// Задание
interface Question {
  id: string;
  externalId?: string;  // A1, B2, etc.
  type: QuestionType;   // SINGLE_CHOICE, TEXT_INPUT, etc.
  difficulty: 1 | 2 | 3 | 4 | 5;
  content: string;      // Markdown
  options?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  solution?: string;
  hints?: {
    small?: string;
    detailed?: string;
    stepByStep?: string[];
  };
  videoExplanation?: {
    url: string;
    duration: number;
    title: string;
  };
}
```

---

## Backend Архитектура

### 1. API Routes

```
app/api/
├── auth/
│   ├── register/route.ts    # POST /api/auth/register
│   ├── login/route.ts       # POST /api/auth/login
│   └── [...nextauth]/       # NextAuth.js
├── subjects/
│   └── route.ts             # GET /api/subjects
├── questions/
│   └── route.ts             # GET/POST /api/questions
├── comments/
│   └── route.ts             # GET/POST /api/comments
├── leaderboard/
│   └── route.ts             # GET /api/leaderboard
└── ...
```

### 2. Пример API Route

```ts
// app/api/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  
  const questions = await prisma.question.findMany({
    where: { subjectId, status: 'ACTIVE' },
    take: 20,
  });
  
  return NextResponse.json({ questions });
}
```

### 3. Prisma Schema

```prisma
// Основные модели
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?
  name      String?
  role      UserRole @default(USER)
  xp        Int      @default(0)
  level     Int      @default(1)
  // ... relations
}

model Question {
  id            String        @id @default(cuid())
  content       String
  type          QuestionType
  difficulty    Int
  correctAnswer String
  explanation   String
  status        ContentStatus @default(ACTIVE)
  // ...
}
```

---

## Кастомизация

### 1. Добавить новый предмет

```ts
// src/data/subjects.ts
export const subjects: Subject[] = [
  // ... existing subjects
  {
    id: 'geography',
    slug: 'geography',
    name: 'География',
    nameShort: 'Геог.',
    description: 'Физическая и экономическая география',
    icon: 'Globe',
    color: 'hsl(199 89% 48%)',
    gradient: 'from-sky-500 to-blue-600',
    order: 9,
    isActive: true,
    stats: { questionsCount: 400, topicsCount: 6, rating: 4.5 },
  },
];
```

### 2. Добавить новое достижение

```ts
// src/store/useAppStore.ts
const defaultAchievements: Achievement[] = [
  // ... existing achievements
  {
    id: 'geography-master',
    name: 'Географ',
    description: 'Решите 50 заданий по географии',
    icon: '🌍',
    unlocked: false,
    xp: 100,
    rarity: 'rare',
    category: 'practice',
  },
];
```

### 3. Изменить цветовую схему

```css
/* src/index.css */
:root {
  --primary: 217 91% 60%;  /* Изменить оттенок */
  --subject-math: 263 70% 50%;
  /* ... */
}
```

---

## Полезные сниппеты

### Получить текущего пользователя
```tsx
const { user, isAuthenticated } = useAppStore();
```

### Добавить XP
```tsx
const { addXp, unlockAchievement } = useAppStore();
addXp(50);
unlockAchievement('marathoner');
```

### Показать уведомление
```tsx
const { addNotification } = useAppStore();
addNotification({
  type: 'success',
  title: 'Отлично!',
  message: 'Вы решили задание правильно',
});
```

### API запрос
```tsx
const fetchQuestions = async (subjectId: string) => {
  const res = await fetch(`/api/questions?subjectId=${subjectId}`);
  const data = await res.json();
  return data.questions;
};
```

---

## Отладка

### Логирование store
```tsx
// Включить Redux DevTools для Zustand
import { devtools } from 'zustand/middleware';

const useAppStore = create<AppState>()(
  devtools(
    persist(...),
    { name: 'CT-Platform Store' }
  )
);
```

### Проверка типов
```bash
# Frontend
cd app && npx tsc --noEmit

# Backend
cd backend && npx tsc --noEmit
```

---

## Расширение функциональности

### Добавить новую страницу

1. Создать файл в `src/pages/NewPage.tsx`
2. Добавить роут в `App.tsx`
3. Добавить ссылку в навигацию

### Добавить API endpoint

1. Создать файл `backend/app/api/new-feature/route.ts`
2. Экспортировать `GET`/`POST`/`PUT`/`DELETE` функции
3. Добавить валидацию с помощью Zod

### Добавить компонент

1. Создать файл в `src/components/category/ComponentName.tsx`
2. Экспортировать интерфейс Props
3. Использовать в страницах
