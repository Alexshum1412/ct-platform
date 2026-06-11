export function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyTags(tags: string[] | string | null | undefined): string {
  if (!tags) return '[]';
  if (Array.isArray(tags)) return JSON.stringify(tags);
  return tags;
}

export function parseOptions(options: string | object | null | undefined): object[] | null {
  if (!options) return null;
  if (typeof options === 'object') return options as object[];
  try {
    return JSON.parse(options as string);
  } catch {
    return null;
  }
}

export function parseJson(value: string | object | null | undefined): unknown {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return null;
  }
}

export function formatQuestion(q: Record<string, unknown> & { tags: string; options?: string | null; hints?: string | null; images?: string | null }) {
  return {
    ...q,
    tags: parseTags(q.tags),
    options: parseOptions(q.options),
    hints: parseJson(q.hints),
    images: q.images ? (parseJson(q.images) as string[] | null) : null,
  };
}

/**
 * Единая нормализация ответа для сравнения (практика и экзамен).
 * trim + lowercase + запятая→точка (русская десятичная запись «0,5» ≡ «0.5»)
 * + схлопывание повторных пробелов. Для id вариантов (A/B/...) безвредна.
 */
export function normalizeAnswer(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ');
}

/**
 * Версия вопроса для выдачи ЭКЗАМЕНА до сдачи: без правильного ответа,
 * объяснения, решения, подсказок и без флагов isCorrect в вариантах — иначе
 * ответы видны в Network-вкладке прямо во время экзамена.
 */
export function formatQuestionForExam(q: Record<string, unknown> & { tags: string; options?: string | null; hints?: string | null; images?: string | null }) {
  const full = formatQuestion(q);
  const options = Array.isArray(full.options)
    ? (full.options as Array<Record<string, unknown>>).map(o => ({ id: o.id, text: o.text }))
    : full.options;
  return {
    ...full,
    options,
    correctAnswer: undefined,
    explanation: undefined,
    solution: undefined,
    hints: undefined,
  };
}
