// Subject types
export interface Subject {
  id: string;
  slug: string;
  name: string;
  nameShort?: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  order: number;
  isActive: boolean;
  stats: {
    questionsCount: number;
    topicsCount: number;
    rating: number;
  };
}

// Topic types
export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description?: string;
  order: number;
  progress?: number;
  subtopics?: Subtopic[];
  questionsCount?: number;
  subtopicsCount?: number;
  theoryCount?: number;
}

export interface Subtopic {
  id: string;
  topicId: string;
  name: string;
  description?: string;
  order: number;
  progress?: number;
}

// Question types
export type QuestionType = 
  | 'SINGLE_CHOICE' 
  | 'MULTIPLE_CHOICE' 
  | 'TEXT_INPUT' 
  | 'MATCHING' 
  | 'ORDERING';

/**
 * Интерфейс вопроса для тренировки и экзаменов
 * Поддерживает формулы в формате KaTeX/LaTeX
 */
export interface Question {
  id: string;
  externalId?: string;
  subjectId: string;
  topicId?: string;
  subtopicId?: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Часть теста: "A" (выбор ответа) или "B" (открытый ответ) */
  part?: 'A' | 'B';
  /** Официальный раздел РИКЗ */
  section?: string;
  /** Только для Premium */
  isPremium?: boolean;
  /** Источник (ЦТ 2027, Авторское, ...) */
  source?: string;
  /** Год задания */
  year?: number;
  /** URL изображения, прикреплённого к заданию */
  imageUrl?: string;
  /** Дополнительные изображения */
  images?: string[];
  /** 
   * Содержимое вопроса
   * Поддерживает LaTeX формулы: $...$ для inline, $$...$$ для блочных
   */
  content: string;
  /** Варианты ответов (для SINGLE_CHOICE/MULTIPLE_CHOICE) */
  options?: QuestionOption[];
  /** Правильный ответ (ID опции или текст) */
  correctAnswer: string | string[];
  /** 
   * Объяснение ответа
   * Поддерживает LaTeX формулы
   */
  explanation: string;
  /** 
   * Подробное решение
   * Поддерживает LaTeX формулы
   */
  solution?: string;
  /** ID связанной теории */
  relatedTheoryId?: string;
  /** Теги для фильтрации */
  tags: string[];
  /** Сколько раз решали (реальная статистика из БД) */
  timesSolved: number;
  /** Сколько раз ответили правильно */
  timesCorrect: number;
  /** Среднее время решения в секундах */
  avgTimeSeconds?: number;
  /** 
   * Подсказки трёх уровней
   * Каждая подсказка - массив строк с поддержкой LaTeX
   */
  hints?: {
    /** Маленькая подсказка (направление мысли) */
    small?: string[];
    /** Подробная подсказка (формулы, правила) */
    detailed?: string[];
    /** Пошаговое решение */
    stepby?: string[];
  };
  /** URL видео-разбора (YouTube, Vimeo и т.д.) */
  videoExplanationUrl?: string;
  /** ID блока заданий (если задание часть блока с общим текстом) */
  blockId?: string;
  /** Порядковый номер в блоке */
  blockOrder?: number;
  /** Общий контекст/текст для блока заданий */
  blockContext?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

// Theory types
export interface Theory {
  id: string;
  subjectId: string;
  topicId?: string;
  subtopicId?: string;
  title: string;
  content: string;
  formulas?: Formula[];
  examples?: Example[];
  summary?: string | null;
  commonMistakes?: string[] | null;
  examTraps?: string[] | null;
  order: number;
  tags: string[];
}

export interface Formula {
  id: string;
  name: string;
  formula: string;
  description?: string;
}

export interface Example {
  id: string;
  problem: string;
  solution: string;
  explanation?: string;
}

// User progress types
export interface UserProgress {
  id: string;
  userId: string;
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  timeSpent: number;
  attemptNumber: number;
  sessionId?: string;
  createdAt: Date;
}

// Exam types
export interface ExamAttempt {
  id: string;
  userId: string;
  subjectId: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade?: number;
  startedAt: Date;
  completedAt?: Date;
  totalTime: number;
  isCompleted: boolean;
  questions?: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  examAttemptId: string;
  questionId: string;
  question?: Question;
  order: number;
  userAnswer?: string;
  isCorrect?: boolean;
  timeSpent?: number;
}

export interface ExamConfig {
  id: string;
  subjectId: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  structure: ExamPart[];
}

export interface ExamPart {
  type: string;
  count: number;
  points: number;
  description: string;
}

// User types
export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';
export type PlanType = 'FREE' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  image?: string;
  plan: PlanType;
  createdAt: Date;
  updatedAt: Date;
  city?: string;
  school?: string;
  grade?: number;
  birthDate?: Date;
  xp?: number;
  level?: number;
  streakDays?: number;
}

// Statistics types
export interface UserStats {
  totalSolved: number;
  correctCount: number;
  accuracy: number;
  totalTime: number;
  streakDays: number;
  bySubject: SubjectStats[];
}

export interface SubjectStats {
  subjectId: string;
  subjectName: string;
  totalSolved: number;
  correctCount: number;
  accuracy: number;
  byTopic: TopicStats[];
}

export interface TopicStats {
  topicId: string;
  topicName: string;
  totalSolved: number;
  correctCount: number;
  accuracy: number;
}

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  xp: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  category?: 'practice' | 'streak' | 'exam' | 'social';
  progress?: number;
  total?: number;
}

// Badge types
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

// Favorite types
export interface Favorite {
  id: string;
  userId: string;
  questionId: string;
  question?: Question;
  createdAt: Date;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

// Practice session types
export interface PracticeSession {
  id: string;
  userId: string;
  subjectId: string;
  topicId?: string;
  subtopicId?: string;
  questionType?: QuestionType;
  difficulty?: number;
  startedAt: Date;
  endedAt?: Date;
  questionsAnswered: number;
  correctAnswers: number;
}

// Comment types
export interface Comment {
  id: string;
  questionId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  isLiked?: boolean;
  replies?: Comment[];
}

// Report types
export interface QuestionReport {
  id: string;
  questionId: string;
  userId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user?: User;
  xp: number;
  solved: number;
  accuracy: number;
  streak: number;
  city?: string;
  school?: string;
}

// Daily limit types
export interface DailyLimit {
  date: string;
  count: number;
  limit: number;
  remaining: number | null;
  isPremium: boolean;
  resetAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Analytics types
export interface AnalyticsMetrics {
  dau: number;
  mau: number;
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  avgSessionTime: number;
  avgProgress: number;
  conversionRate: number;
  examSuccessRate: number;
  topFailedTopics: {
    topicId: string;
    topicName: string;
    failRate: number;
  }[];
}

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  paymentMethod?: string;
  autoRenew: boolean;
}

// Notification types
export interface UserNotification {
  id: string;
  userId: string;
  type: 'achievement' | 'streak' | 'reminder' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}
