/**
 * Данные предметов и API-функции для работы с ними
 * 
 * ВАЖНО: Этот файл содержит только КОНФИГУРАЦИЮ предметов
 * Все данные (вопросы, темы, теория) загружаются с backend API
 * 
 * Ссылки на API endpoints:
 * - GET /api/subjects - список предметов
 * - GET /api/subjects/:id/questions - вопросы по предмету
 * - GET /api/subjects/:id/topics - темы предмета
 * - GET /api/subjects/:id/theory - теория по предмету
 * - GET /api/exam-configs/:subjectId - конфигурация экзамена
 */

import type { Subject, Topic, Question, Theory, ExamConfig } from '@/types';

// =====================================================
// БАЗОВАЯ КОНФИГУРАЦИЯ ПРЕДМЕТОВ
// Эти данные статичны и используются для отображения
// =====================================================

/**
 * Список предметов ЦТ/ЦЭ
 * Используется для отображения карточек и навигации
 * 
 * Примечание: stats загружаются динамически с API
 * при монтировании компонентов
 */
export const subjects: Subject[] = [
  {
    id: 'math',
    slug: 'math',
    name: 'Математика',
    nameShort: 'Математика', // Полное название для Header
    description: 'Алгебра, геометрия, тригонометрия и анализ',
    icon: 'Calculator',
    color: 'hsl(263 70% 50%)',
    gradient: 'gradient-math',
    order: 1,
    isActive: true,
    stats: {
      questionsCount: 0, // Будет загружено с API
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'russian',
    slug: 'russian',
    name: 'Русский язык',
    nameShort: 'Русский язык',
    description: 'Орфография, пунктуация, синтаксис и лексика',
    icon: 'PenTool',
    color: 'hsl(330 80% 60%)',
    gradient: 'gradient-russian',
    order: 2,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'physics',
    slug: 'physics',
    name: 'Физика',
    nameShort: 'Физика',
    description: 'Механика, термодинамика, электродинамика и оптика',
    icon: 'Atom',
    color: 'hsl(189 94% 43%)',
    gradient: 'gradient-physics',
    order: 3,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'chemistry',
    slug: 'chemistry',
    name: 'Химия',
    nameShort: 'Химия',
    description: 'Неорганическая, органическая и общая химия',
    icon: 'FlaskConical',
    color: 'hsl(160 84% 39%)',
    gradient: 'gradient-chemistry',
    order: 4,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'biology',
    slug: 'biology',
    name: 'Биология',
    nameShort: 'Биология',
    description: 'Ботаника, зоология, анатомия и генетика',
    icon: 'Dna',
    color: 'hsl(84 81% 44%)',
    gradient: 'from-lime-500 to-green-600',
    order: 5,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'history',
    slug: 'history',
    name: 'История Беларуси',
    nameShort: 'История Беларуси',
    description: 'История Беларуси в контексте всемирной истории',
    icon: 'Globe',
    color: 'hsl(24 95% 53%)',
    gradient: 'from-orange-500 to-amber-600',
    order: 6,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'english',
    slug: 'english',
    name: 'Английский язык',
    nameShort: 'Английский язык',
    description: 'Грамматика, лексика, чтение и аудирование',
    icon: 'Languages',
    color: 'hsl(239 84% 67%)',
    gradient: 'from-indigo-500 to-purple-600',
    order: 7,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'belarusian',
    slug: 'belarusian',
    name: 'Белорусский язык',
    nameShort: 'Белорусский язык',
    description: 'Арфаграфія, пунктуацыя, сінтаксіс і лексіка',
    icon: 'BookOpen',
    color: 'hsl(0 84% 60%)',
    gradient: 'from-red-500 to-rose-600',
    order: 8,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'world-history',
    slug: 'world-history',
    name: 'Всемирная история',
    nameShort: 'Всемирная история',
    description: 'История древнего мира, средневековья, нового и новейшего времени',
    icon: 'Scroll',
    color: 'hsl(35 90% 55%)',
    gradient: 'from-amber-500 to-yellow-600',
    order: 9,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'social-studies',
    slug: 'social-studies',
    name: 'Обществоведение',
    nameShort: 'Обществоведение',
    description: 'Право, экономика, философия и социология',
    icon: 'Scale',
    color: 'hsl(280 70% 50%)',
    gradient: 'from-purple-500 to-violet-600',
    order: 10,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  {
    id: 'geography',
    slug: 'geography',
    name: 'География',
    nameShort: 'География',
    description: 'Физическая и экономическая география',
    icon: 'Map',
    color: 'hsl(145 70% 45%)',
    gradient: 'from-emerald-500 to-teal-600',
    order: 11,
    isActive: true,
    stats: {
      questionsCount: 0,
      topicsCount: 0,
      rating: 0,
    },
  },
  // Немецкий/французский/испанский/китайский временно убраны из каталога: в БД для них
  // ещё нет данных (заданий, тем, теории), а пустые карточки портят UX. Чтобы вернуть
  // предмет — наполните его контентом в БД и восстановите конфигурацию здесь.
];

// =====================================================
// API ФУНКЦИИ (заглушки - заменить на реальные вызовы)
// =====================================================

import { API_BASE_URL } from '@/lib/api/client';

/**
 * Получить предмет по slug
 */
export function getSubjectBySlug(slug: string): Subject | undefined {
  return subjects.find((s) => s.slug === slug);
}

/**
 * Получить предмет по ID
 */
export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

/**
 * Получить темы предмета с API
 * 
 * ССЫЛКА: GET /api/subjects/:subjectId/topics
 */
export async function fetchTopicsBySubjectId(subjectId: string): Promise<Topic[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/topics`);
    if (!response.ok) throw new Error('Failed to fetch topics');
    return await response.json();
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

/**
 * Получить вопросы предмета с API
 * 
 * ССЫЛКА: GET /api/subjects/:subjectId/questions
 */
export async function fetchQuestionsBySubjectId(
  subjectId: string,
  options?: {
    topicId?: string;
    difficulty?: number;
    limit?: number;
    offset?: number;
  }
): Promise<Question[]> {
  try {
    const params = new URLSearchParams();
    if (options?.topicId) params.append('topicId', options.topicId);
    if (options?.difficulty) params.append('difficulty', String(options.difficulty));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    
    const response = await fetch(
      `${API_BASE_URL}/subjects/${subjectId}/questions?${params}`
    );
    if (!response.ok) throw new Error('Failed to fetch questions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

/**
 * Получить вопросы по ID темы с API
 * 
 * ССЫЛКА: GET /api/topics/:topicId/questions
 */
export async function fetchQuestionsByTopicId(topicId: string): Promise<Question[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}/questions`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching questions by topic:', error);
    return [];
  }
}

/**
 * Получить теорию по ID с API
 * 
 * ССЫЛКА: GET /api/theory/:id
 */
export async function fetchTheoryById(id: string): Promise<Theory | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/theory/${id}`);
    if (!response.ok) throw new Error('Failed to fetch theory');
    return await response.json();
  } catch (error) {
    console.error('Error fetching theory:', error);
    return null;
  }
}

/**
 * Получить теорию по теме с API
 *
 * ССЫЛКА: GET /api/topics/:topicId/theory
 */
export async function fetchTheoryByTopicId(topicId: string): Promise<Theory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}/theory`);
    if (!response.ok) throw new Error('Failed to fetch theory');
    return await response.json();
  } catch (error) {
    console.error('Error fetching theory by topic:', error);
    return [];
  }
}

/**
 * Получить под-темы по ID темы с API
 * ССЫЛКА: GET /api/topics/:topicId/subtopics
 */
export async function fetchSubtopicsByTopicId(topicId: string): Promise<Array<{ id: string; topicId: string; name: string; description?: string; order: number; questionsCount: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}/subtopics`);
    if (!response.ok) throw new Error('Failed to fetch subtopics');
    return await response.json();
  } catch (error) {
    console.error('Error fetching subtopics:', error);
    return [];
  }
}

/**
 * Получить конфигурацию экзамена с API
 * 
 * ССЫЛКА: GET /api/exam-configs/:subjectId
 */
export async function fetchExamConfigBySubjectId(
  subjectId: string
): Promise<ExamConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/exam-configs/${subjectId}`);
    if (!response.ok) throw new Error('Failed to fetch exam config');
    return await response.json();
  } catch (error) {
    console.error('Error fetching exam config:', error);
    return null;
  }
}

/**
 * Получить статистику предмета с API
 * 
 * ССЫЛКА: GET /api/subjects/:subjectId/stats
 */
export async function fetchSubjectStats(subjectId: string): Promise<{
  questionsCount: number;
  topicsCount: number;
  rating: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch subject stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching subject stats:', error);
    return { questionsCount: 0, topicsCount: 0, rating: 0 };
  }
}

// =====================================================
// ЭКЗАМЕНЫ (созданные человеком сущности по предмету)
// =====================================================

export interface ExamSummary {
  id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingScore: number;
  questionCount: number;
}

export interface ExamDetail {
  id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingScore: number;
  questions: Question[];
}

/** Список экзаменов предмета. ССЫЛКА: GET /api/subjects/:subjectId/exams */
export async function fetchExamsBySubjectId(subjectId: string): Promise<ExamSummary[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/exams`);
    if (!response.ok) throw new Error('Failed to fetch exams');
    return await response.json();
  } catch (error) {
    console.error('Error fetching exams:', error);
    return [];
  }
}

/** Детали экзамена с вопросами. ССЫЛКА: GET /api/exams/:id */
export async function fetchExamById(id: string): Promise<ExamDetail | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/exams/${id}`);
    if (!response.ok) throw new Error('Failed to fetch exam');
    return await response.json();
  } catch (error) {
    console.error('Error fetching exam:', error);
    return null;
  }
}

