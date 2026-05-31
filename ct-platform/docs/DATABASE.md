# 🗄 Документация базы данных

## ER-диаграмма

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     User        │     │    Subject      │     │     Topic       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │────▶│ id (PK)         │◄────│ id (PK)         │
│ email           │     │ slug (UQ)       │     │ subjectId (FK)  │
│ name            │     │ name            │     │ name            │
│ role            │     │ description     │     │ order           │
│ createdAt       │     │ icon            │     └─────────────────┘
└─────────────────┘     │ color           │              │
         │              │ isActive        │              │
         │              └─────────────────┘              ▼
         │                                               │
         ▼                                               ▼
┌─────────────────┐                          ┌─────────────────┐
│  UserProgress   │                          │    Subtopic     │
├─────────────────┤                          ├─────────────────┤
│ id (PK)         │                          │ id (PK)         │
│ userId (FK)     │                          │ topicId (FK)    │
│ questionId (FK) │◄─────────────────────────│ name            │
│ isCorrect       │                          │ order           │
│ timeSpent       │                          └─────────────────┘
│ attemptNumber   │                                   │
└─────────────────┘                                   │
         │                                            ▼
         │                                   ┌─────────────────┐
         │                                   │    Question     │
         │                                   ├─────────────────┤
         │                          ┌───────▶│ id (PK)         │
         │                          │        │ externalId (UQ) │
         │                          │        │ subjectId (FK)  │
         │                          │        │ topicId (FK)    │
         │                          │        │ subtopicId (FK) │
         │                          │        │ type            │
         │                          │        │ difficulty      │
         │                          │        │ content         │
         │                          │        │ options         │
         │                          │        │ correctAnswer   │
         │                          │        │ explanation     │
         │                          │        │ solution        │
         │                          │        │ relatedTheoryId │
         │                          │        │ timesSolved     │
         │                          │        │ timesCorrect    │
         │                          │        └─────────────────┘
         │                          │                 │
         │                          │                 ▼
         │                          │        ┌─────────────────┐
         │                          │        │     Theory      │
         │                          │        ├─────────────────┤
         │                          └────────│ id (PK)         │
         │                                   │ subjectId (FK)  │
         │                                   │ topicId (FK)    │
         │                                   │ title           │
         │                                   │ content         │
         │                                   │ formulas        │
         │                                   │ examples        │
         │                                   └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ExamAttempt    │     │  ExamQuestion   │     │    Favorite     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄────│ examAttemptId   │     │ id (PK)         │
│ userId (FK)     │     │ questionId (FK) │────▶│ userId (FK)     │
│ subjectId (FK)  │     │ order           │     │ questionId (FK) │
│ score           │     │ userAnswer      │     │ createdAt       │
│ maxScore        │     │ isCorrect       │     └─────────────────┘
│ percentage      │     │ timeSpent       │
│ grade           │     └─────────────────┘
│ startedAt       │
│ completedAt     │
│ isCompleted     │
└─────────────────┘
```

---

## Детальное описание таблиц

### 1. User (Пользователи)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `email` | String | Email пользователя (уникальный) |
| `name` | String? | Имя пользователя |
| `role` | Enum | Роль: USER, ADMIN, MODERATOR |
| `emailVerified` | DateTime? | Дата подтверждения email |
| `image` | String? | Аватар |
| `createdAt` | DateTime | Дата регистрации |
| `updatedAt` | DateTime | Дата обновления |

**Индексы:**
- `email` — уникальный
- `role` — для фильтрации

---

### 2. Subject (Предметы)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `slug` | String | URL-идентификатор (math, russian) |
| `name` | String | Название предмета |
| `nameShort` | String? | Короткое название |
| `description` | String? | Описание |
| `icon` | String? | Иконка (Lucide icon name) |
| `color` | String? | Цвет темы (hex) |
| `order` | Int | Порядок отображения |
| `isActive` | Boolean | Активен ли предмет |

**Индексы:**
- `slug` — уникальный
- `order` — для сортировки
- `isActive` — для фильтрации

---

### 3. Topic (Темы)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `subjectId` | String | ID предмета |
| `name` | String | Название темы |
| `description` | String? | Описание |
| `order` | Int | Порядок отображения |

**Индексы:**
- `subjectId` — для связи
- `[subjectId, order]` — для сортировки в предмете

---

### 4. Subtopic (Подтемы)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `topicId` | String | ID темы |
| `name` | String | Название подтемы |
| `description` | String? | Описание |
| `order` | Int | Порядок отображения |

**Индексы:**
- `topicId` — для связи

---

### 5. Question (Задания)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `externalId` | String? | Внешний ID (A1, B2 и т.д.) |
| `subjectId` | String | ID предмета |
| `topicId` | String? | ID темы |
| `subtopicId` | String? | ID подтемы |
| `type` | Enum | Тип задания |
| `difficulty` | Int | Сложность 1-5 |
| `content` | String | Условие (Markdown) |
| `options` | Json? | Варианты ответов |
| `correctAnswer` | String | Правильный ответ |
| `explanation` | String | Пояснение (Markdown) |
| `solution` | String? | Пошаговое решение |
| `relatedTheoryId` | String? | ID связанной теории |
| `tags` | String[] | Теги |
| `year` | Int? | Год из сборника |
| `source` | String? | Источник |
| `timesSolved` | Int | Сколько раз решали |
| `timesCorrect` | Int | Сколько раз правильно |
| `avgTimeSeconds` | Int? | Среднее время решения |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Типы заданий (QuestionType):**
```typescript
enum QuestionType {
  SINGLE_CHOICE    // A-задания: выбор одного ответа
  MULTIPLE_CHOICE  // B-задания: выбор нескольких
  TEXT_INPUT       // C-задания: текстовый ввод
  MATCHING         // Сопоставление
  ORDERING         // Упорядочивание
}
```

**Индексы:**
- `externalId` — уникальный
- `subjectId` — для фильтрации по предмету
- `topicId` — для фильтрации по теме
- `subtopicId` — для фильтрации по подтеме
- `difficulty` — для адаптивной выборки
- `tags` — для поиска
- `[subjectId, type, difficulty]` — композитный для практики

---

### 6. Theory (Теория)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `subjectId` | String | ID предмета |
| `topicId` | String? | ID темы |
| `subtopicId` | String? | ID подтемы |
| `title` | String | Заголовок |
| `content` | String | Содержание (Markdown) |
| `formulas` | Json? | Формулы [{name, formula, description}] |
| `examples` | Json? | Примеры [{problem, solution}] |
| `order` | Int | Порядок отображения |
| `tags` | String[] | Теги |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Индексы:**
- `subjectId` — для фильтрации
- `topicId` — для фильтрации
- `[subjectId, order]` — для сортировки

---

### 7. UserProgress (Прогресс пользователя)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `userId` | String | ID пользователя |
| `questionId` | String | ID задания |
| `isCorrect` | Boolean | Правильно ли решено |
| `userAnswer` | String | Ответ пользователя |
| `timeSpent` | Int | Время в секундах |
| `attemptNumber` | Int | Номер попытки |
| `sessionId` | String? | ID сессии практики |
| `createdAt` | DateTime | Дата решения |

**Индексы:**
- `[userId, questionId, attemptNumber]` — уникальный
- `userId` — для статистики пользователя
- `questionId` — для статистики задания
- `createdAt` — для временных рядов

---

### 8. ExamAttempt (Попытки экзамена)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `userId` | String | ID пользователя |
| `subjectId` | String | ID предмета |
| `score` | Int | Набранные баллы |
| `maxScore` | Int | Максимальные баллы |
| `percentage` | Float | Процент |
| `grade` | Int? | Оценка по шкале ЦТ |
| `startedAt` | DateTime | Начало |
| `completedAt` | DateTime? | Окончание |
| `totalTime` | Int | Общее время в секундах |
| `isCompleted` | Boolean | Завершён ли |

**Индексы:**
- `userId` — для истории пользователя
- `subjectId` — для статистики предмета
- `startedAt` — для сортировки

---

### 9. ExamQuestion (Вопросы в экзамене)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `examAttemptId` | String | ID попытки |
| `questionId` | String | ID задания |
| `order` | Int | Порядок в экзамене |
| `userAnswer` | String? | Ответ пользователя |
| `isCorrect` | Boolean? | Правильно ли |
| `timeSpent` | Int? | Время в секундах |

**Индексы:**
- `examAttemptId` — для связи
- `questionId` — для статистики

---

### 10. Favorite (Избранное)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `userId` | String | ID пользователя |
| `questionId` | String | ID задания |
| `createdAt` | DateTime | Дата добавления |

**Индексы:**
- `[userId, questionId]` — уникальный
- `userId` — для списка избранного

---

### 11. ExamConfig (Конфигурация экзамена)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `subjectId` | String | ID предмета |
| `durationMinutes` | Int | Длительность экзамена |
| `totalQuestions` | Int | Количество вопросов |
| `passingScore` | Int | Проходной балл |
| `structure` | Json | Структура экзамена |

**Пример structure:**
```json
{
  "parts": [
    { "type": "A", "count": 10, "points": 1, "description": "Выбор одного ответа" },
    { "type": "B", "count": 6, "points": 2, "description": "Выбор нескольких ответов" },
    { "type": "C", "count": 4, "points": 3, "description": "Текстовый ответ" }
  ]
}
```

---

### 12. Subscription (Подписки)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (CUID) | Уникальный идентификатор |
| `userId` | String | ID пользователя |
| `plan` | Enum | Тип подписки |
| `startDate` | DateTime | Начало |
| `endDate` | DateTime | Окончание |
| `isActive` | Boolean | Активна ли |

**Типы подписок:**
```typescript
enum PlanType {
  FREE
  PREMIUM_MONTHLY
  PREMIUM_YEARLY
}
```

---

## Запросы для аналитики

### Статистика пользователя по предмету
```sql
SELECT 
  q.topicId,
  COUNT(*) as totalAttempts,
  SUM(CASE WHEN up.isCorrect THEN 1 ELSE 0 END) as correctCount,
  ROUND(
    SUM(CASE WHEN up.isCorrect THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
    2
  ) as accuracy
FROM UserProgress up
JOIN Question q ON up.questionId = q.id
WHERE up.userId = 'user_id'
  AND q.subjectId = 'subject_id'
GROUP BY q.topicId;
```

### Самые сложные задания
```sql
SELECT 
  q.id,
  q.content,
  q.timesSolved,
  q.timesCorrect,
  ROUND(q.timesCorrect * 100.0 / q.timesSolved, 2) as successRate
FROM Question q
WHERE q.timesSolved > 10
ORDER BY successRate ASC
LIMIT 20;
```

### Прогресс пользователя за неделю
```sql
SELECT 
  DATE(up.createdAt) as date,
  COUNT(*) as questionsSolved,
  ROUND(
    SUM(CASE WHEN up.isCorrect THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as accuracy
FROM UserProgress up
WHERE up.userId = 'user_id'
  AND up.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(up.createdAt)
ORDER BY date;
```

---

## Миграции и сиды

### Создание миграции
```bash
npx prisma migrate dev --name add_user_stats
```

### Генерация клиента
```bash
npx prisma generate
```

### Сид данных
```bash
npx prisma db seed
```

### Сброс БД
```bash
npx prisma migrate reset
```
