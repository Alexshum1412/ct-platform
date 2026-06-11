// Общая логика олимпиадного раздела: уровни этапов, очки, выдача задач без ответов.

import { parseTags, parseJson } from '@/lib/utils';

/** Этапы республиканской олимпиады РБ (по возрастанию). */
export const OLYMPIAD_LEVELS = ['SCHOOL', 'DISTRICT', 'REGION', 'REPUBLIC'] as const;
export type OlympiadLevel = (typeof OLYMPIAD_LEVELS)[number];

export const LEVEL_LABELS: Record<OlympiadLevel, string> = {
  SCHOOL: 'Школьный этап',
  DISTRICT: 'Районный этап',
  REGION: 'Областной этап',
  REPUBLIC: 'Республиканский этап',
};

/** Очки по умолчанию за решение задачи каждого уровня (антиинфляция — фиксированы на задаче). */
export const LEVEL_POINTS: Record<OlympiadLevel, number> = {
  SCHOOL: 10,
  DISTRICT: 20,
  REGION: 35,
  REPUBLIC: 50,
};

export function isOlympiadLevel(value: string | null | undefined): value is OlympiadLevel {
  return !!value && (OLYMPIAD_LEVELS as readonly string[]).includes(value);
}

type ProblemRow = Record<string, unknown> & {
  tags: string;
  hints: string;
  options?: string | null;
};

/**
 * Версия задачи для выдачи клиенту ДО решения: без ответа и разбора
 * (иначе они видны в Network-вкладке). Подсказки отдаются — они часть UX
 * и не содержат ответа.
 */
export function formatProblemPublic(p: ProblemRow) {
  return {
    ...p,
    tags: parseTags(p.tags),
    hints: (parseJson(p.hints) as string[] | null) ?? [],
    options: p.options ? parseJson(p.options) : null,
    answer: undefined,
    solution: undefined,
  };
}

/** Полная версия (после верного ответа / раскрытия разбора / для админа). */
export function formatProblemFull(p: ProblemRow) {
  return {
    ...p,
    tags: parseTags(p.tags),
    hints: (parseJson(p.hints) as string[] | null) ?? [],
    options: p.options ? parseJson(p.options) : null,
  };
}

/** Краткая карточка для списков: без content/answer/solution/hints. */
export function formatProblemCard(p: ProblemRow) {
  return {
    id: p.id,
    title: p.title,
    subjectId: p.subjectId,
    level: p.level,
    difficulty: p.difficulty,
    topic: p.topic,
    grade: p.grade,
    year: p.year,
    points: p.points,
    tags: parseTags(p.tags),
  };
}
