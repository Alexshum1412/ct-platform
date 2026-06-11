import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Нормализация ответа перед сравнением — ЗЕРКАЛО серверной normalizeAnswer
 * (backend lib/utils.ts): trim + lowercase + запятая→точка + схлопывание пробелов.
 * Иначе « 5» или «0,5» в открытом ответе подсвечивались как ошибка, хотя сервер
 * (или экзамен) считал их верными.
 */
export function normalizeAnswer(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ');
}
