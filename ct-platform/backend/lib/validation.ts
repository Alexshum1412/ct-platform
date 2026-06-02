import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Имя должно быть не менее 2 символов'),
  email: z.string().email('Некорректный email'),
  password: z.string()
    .min(8, 'Пароль должен быть не менее 8 символов')
    .regex(/[a-z]/, 'Пароль должен содержать строчную букву')
    .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву')
    .regex(/\d/, 'Пароль должен содержать цифру'),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

// Question validation schemas
export const createQuestionSchema = z.object({
  subjectId: z.string(),
  topicId: z.string().optional(),
  subtopicId: z.string().optional(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT_INPUT', 'MATCHING', 'ORDERING']),
  difficulty: z.number().min(1).max(5),
  part: z.enum(['A', 'B']).optional(),
  section: z.string().optional(),
  content: z.string().min(10, 'Условие должно быть не менее 10 символов'),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })).optional(),
  correctAnswer: z.string(),
  explanation: z.string().min(10, 'Объяснение должно быть не менее 10 символов'),
  solution: z.string().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  hints: z.object({
    small: z.string().optional(),
    detailed: z.string().optional(),
    stepByStep: z.array(z.string()).optional(),
  }).optional(),
});

// Comment validation
export const createCommentSchema = z.object({
  questionId: z.string(),
  content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Максимум 1000 символов'),
  parentId: z.string().optional(),
});

// Report validation
export const createReportSchema = z.object({
  questionId: z.string(),
  reason: z.enum(['ERROR', 'UNCLEAR', 'INAPPROPRIATE', 'DUPLICATE', 'OTHER']),
  description: z.string().max(500).optional(),
});

// User profile update
export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().optional(),
  school: z.string().optional(),
  grade: z.number().min(1).max(11).optional(),
  // Avatar: a data URL (base64, resized client-side) or an empty string to reset
  // to the initials fallback. Capped to keep the row small (~a few hundred KB max).
  image: z.string().max(2_000_000).optional(),
});

// Types inferred from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
