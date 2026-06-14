/** Стабильный хеш строки → дробь [0,1). Детерминированно, без Math.random,
 *  чтобы порядок не «прыгал» при дозагрузке банка заданий в фоне. */
function hashUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000003) / 1000003;
}

interface Similar {
  id: string;
  topicId?: string | null;
  subtopicId?: string | null;
  part?: string | null;
  type?: string | null;
}

/** Ключ «схожести» задания. Два задания считаются похожими, если у них совпадает
 *  подтема (а при её отсутствии — тема) и часть/тип. Такие задания разносим в выдаче. */
function similarityKey(q: Similar): string {
  return `${q.subtopicId || q.topicId || 'x'}|${q.part || ''}|${q.type || ''}`;
}

/**
 * Умное перемешивание: похожие задания (одна подтема/часть) не идут подряд.
 *
 * Алгоритм:
 *  1. группируем по ключу схожести;
 *  2. внутри группы детерминированно перемешиваем (по хешу id);
 *  3. равномерно «размазываем» каждую группу по всей длине (дробная позиция),
 *     так что элементы одной группы максимально разнесены;
 *  4. локальный проход против смежности: если два соседа одного ключа — меняем
 *     второй с ближайшим из окна с другим ключом.
 *
 * Детерминирован: при дозагрузке новых заданий порядок уже показанных стабилен.
 */
export function smartShuffle<T extends Similar>(items: T[]): T[] {
  if (items.length < 3) return items;

  const groups = new Map<string, T[]>();
  for (const q of items) {
    const k = similarityKey(q);
    const arr = groups.get(k);
    if (arr) arr.push(q);
    else groups.set(k, [q]);
  }

  const positioned: { q: T; key: string; pos: number }[] = [];
  for (const [key, arr] of groups) {
    const shuffled = [...arr].sort((a, b) => hashUnit(a.id) - hashUnit(b.id));
    const n = shuffled.length;
    shuffled.forEach((q, i) => {
      // равномерная позиция в [0,1) + микро-джиттер от хеша, чтобы группы не совпадали
      positioned.push({ q, key, pos: (i + 0.5) / n + hashUnit(key + q.id) * 1e-4 });
    });
  }
  positioned.sort((a, b) => a.pos - b.pos);

  // анти-смежность: ищем замену в небольшом окне впереди (O(n·window))
  const WINDOW = 12;
  for (let i = 1; i < positioned.length; i++) {
    if (positioned[i].key !== positioned[i - 1].key) continue;
    const prevKey = positioned[i - 1].key;
    const limit = Math.min(i + 1 + WINDOW, positioned.length);
    for (let j = i + 1; j < limit; j++) {
      if (positioned[j].key !== prevKey) {
        const tmp = positioned[i];
        positioned[i] = positioned[j];
        positioned[j] = tmp;
        break;
      }
    }
  }

  return positioned.map((p) => p.q);
}
