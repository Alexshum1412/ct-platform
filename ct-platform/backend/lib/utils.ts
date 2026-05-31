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
