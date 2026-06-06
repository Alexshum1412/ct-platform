// API Client for CT-Platform
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_BASE_URL = `${API_URL}/api`;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  /** Машиночитаемый код ошибки от backend (например, DAILY_LIMIT_REACHED) */
  code?: string;
  /** HTTP-статус ответа (для надёжной обработки 402/403/429 и т.п.) */
  status?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, token } = options;

  const url = `${API_URL}/api${endpoint}`;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        error: data?.error || 'Произошла ошибка',
        message: data?.message,
        code: data?.code,
        status: response.status,
      };
    }

    return { data: (data?.data ?? data) as T, status: response.status };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return { error: 'Превышено время ожидания. Попробуйте снова.' };
    }
    return { error: 'Ошибка сети. Проверьте подключение к интернету.' };
  }
}

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient('/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiClient('/auth/login', { method: 'POST', body: data }),

  logout: () => {
    localStorage.removeItem('token');
    return Promise.resolve({ data: { success: true } });
  },

  // Email verification
  verifyEmail: (code: string, token: string) =>
    apiClient<{ success: boolean; token: string; user: unknown; alreadyVerified?: boolean }>(
      '/auth/verify-email', { method: 'POST', body: { code }, token },
    ),
  resendCode: (token: string) =>
    apiClient<{ success: boolean; message: string; devCode?: string }>(
      '/auth/resend-code', { method: 'POST', token },
    ),

  getToken: () => localStorage.getItem('token'),
  setToken: (token: string) => localStorage.setItem('token', token),
};

// Subjects API
export const subjectsApi = {
  getAll: () => apiClient('/subjects'),
  getBySlug: (slug: string) => apiClient(`/subjects/${slug}`),
};

// Questions API
export const questionsApi = {
  getAll: (params?: { subjectId?: string; topicId?: string; difficulty?: number; part?: string; section?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.subjectId) queryParams.append('subjectId', params.subjectId);
    if (params?.topicId) queryParams.append('topicId', params.topicId);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty.toString());
    if (params?.part) queryParams.append('part', params.part);
    if (params?.section) queryParams.append('section', params.section);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    return apiClient(`/questions?${queryParams.toString()}`);
  },

  getById: (id: string) => apiClient(`/questions/${id}`),

  submitAnswer: (data: { questionId: string; answer: string; timeSpent: number }, token: string) =>
    apiClient('/progress', { method: 'POST', body: data, token }),

  report: (data: { questionId: string; reason: string; description?: string }, token: string) =>
    apiClient('/reports', { method: 'POST', body: data, token }),
};

// Daily limit API
export const dailyApi = {
  getStatus: (token: string) => apiClient('/users/daily', { token }),
};

// Comments API
export const commentsApi = {
  getByQuestion: (questionId: string) =>
    apiClient(`/comments?questionId=${questionId}`),

  create: (data: { questionId: string; content: string; parentId?: string }, token: string) =>
    apiClient('/comments', { method: 'POST', body: data, token }),
};

// Leaderboard API
export const leaderboardApi = {
  getGlobal: (limit = 10) => apiClient(`/leaderboard?type=global&limit=${limit}`),
  getBySubject: (subjectId: string) => apiClient(`/leaderboard?type=subject&subjectId=${subjectId}`),
  getByCity: (city: string) => apiClient(`/leaderboard?type=city&city=${city}`),
};

// User API
export const userApi = {
  getProfile: (token: string) => apiClient('/users/me', { token }),
  
  updateProfile: (data: Partial<{ name: string; city: string; school: string; image: string }>, token: string) =>
    apiClient('/users/me', { method: 'PATCH', body: data, token }),

  getStats: (token: string) => apiClient('/users/stats', { token }),
  
  getFavorites: (token: string) => apiClient('/users/favorites', { token }),
  
  addFavorite: (questionId: string, token: string) =>
    apiClient('/users/favorites', { method: 'POST', body: { questionId }, token }),

  removeFavorite: (questionId: string, token: string) =>
    apiClient(`/users/favorites/${questionId}`, { method: 'DELETE', token }),

  // Полный сброс учебного прогресса (ответы, достижения, xp/уровень/серия)
  resetProgress: (token: string) =>
    apiClient<{ success: boolean; deletedAnswers: number; deletedAchievements: number }>(
      '/users/progress', { method: 'DELETE', token },
    ),
};

// Global team click-counter API (public, no auth).
// Raw fetch so we can distinguish 200 / 429 (throttled) / network-error, which the
// batched flush needs (drop on throttle, retry on network error).
export const clicksApi = {
  get: async (): Promise<{ total: number } | null> => {
    try {
      const r = await fetch(`${API_BASE_URL}/clicks`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 429) return null;
      return { total: typeof d.total === 'number' ? d.total : 0 };
    } catch {
      return null;
    }
  },
  add: async (count = 1): Promise<{ total: number; throttled: boolean } | null> => {
    try {
      const r = await fetch(`${API_BASE_URL}/clicks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) return { total: typeof d.total === 'number' ? d.total : 0, throttled: true };
      if (!r.ok) return null;
      return { total: typeof d.total === 'number' ? d.total : 0, throttled: false };
    } catch {
      return null;
    }
  },
};

// Demo-game balance API (persisted balance + auth-protected daily reset limit; premium = unlimited)
export interface GameResetStatus {
  isPremium: boolean;
  used: number;
  remaining: number | null;
  nextResetAt: string | null;
  allowed: boolean;
}
export const gamesApi = {
  getResetStatus: (game: 'roulette' | 'blackjack', token: string) =>
    apiClient<GameResetStatus>(`/games/reset?game=${game}`, { token }),
  reset: (game: 'roulette' | 'blackjack', token: string) =>
    apiClient<{ allowed: boolean; balance: number; isPremium: boolean; remaining: number | null; nextResetAt: string | null }>(
      '/games/reset', { method: 'POST', body: { game }, token },
    ),
  // Постоянный баланс (сохраняется между сессиями)
  getBalance: (game: 'roulette' | 'blackjack', token: string) =>
    apiClient<{ balance: number; reset: GameResetStatus }>(`/games/balance?game=${game}`, { token }),
  saveBalance: (game: 'roulette' | 'blackjack', balance: number, token: string) =>
    apiClient<{ balance: number }>('/games/balance', { method: 'PUT', body: { game, balance }, token }),
};

// Subscription / Premium API
export const subscriptionApi = {
  get: (token: string) =>
    apiClient<{ plan: string; isPremium: boolean; subscription: { startDate: string; endDate: string; plan: string; paymentId?: string } | null }>(
      '/subscription', { token },
    ),
  purchase: (plan: 'monthly' | 'yearly', token: string) =>
    apiClient<{ success: boolean; plan: string; purchasedAt: string; subscription: { startDate: string; endDate: string } }>(
      '/subscription', { method: 'POST', body: { plan }, token },
    ),
};

// Exam API
export const examApi = {
  start: (subjectId: string, token: string, examId?: string) =>
    apiClient('/exam/start', { method: 'POST', body: { subjectId, examId }, token }),

  submit: (attemptId: string, answers: Record<string, string>, token: string) =>
    apiClient('/exam/submit', { method: 'POST', body: { attemptId, answers }, token }),

  getHistory: (token: string) => apiClient('/exam/history', { token }),

  // ID уже завершённых пробных экзаменов (для пометки «решён ранее»)
  getCompleted: (token: string, subjectId?: string) =>
    apiClient<{ examIds: string[] }>(
      `/exam/completed${subjectId ? `?subjectId=${subjectId}` : ''}`, { token },
    ),
};
