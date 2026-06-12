/**
 * Ленивый загрузчик KaTeX: модуль (~265 КБ) и его CSS подтягиваются только
 * когда на странице реально встретилась формула. Страницы без математики
 * (главная, рейтинг, профиль, игры) больше не тянут KaTeX в стартовый бандл.
 */
import type katex from 'katex';

type KatexModule = typeof katex;

let loaded: KatexModule | null = null;
let loading: Promise<KatexModule> | null = null;

/** Синхронно возвращает KaTeX, если он уже загружен (для useMemo-рендера). */
export function getKatex(): KatexModule | null {
  return loaded;
}

/** Загружает KaTeX + стили один раз; повторные вызовы переиспользуют промис. */
export function loadKatex(): Promise<KatexModule> {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    loading = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([mod]) => {
      loaded = mod.default;
      return loaded;
    });
  }
  return loading;
}
