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
      // Просроченный/недействительный токен на авторизованном запросе: чистим сессию
      // и просим войти заново, вместо того чтобы оставить UI висеть на
      // «Недействительный токен» / «Не удалось сохранить ответ». Срабатывает ТОЛЬКО
      // когда токен реально отправлялся (иначе 401 — это просто гость).
      if (response.status === 401 && token) {
        try { localStorage.removeItem('token'); } catch { /* ignore */ }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { error: data?.error } }));
        }
        return {
          error: 'Сессия истекла. Войдите снова, чтобы продолжить.',
          code: 'TOKEN_INVALID',
          status: 401,
        };
      }
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
  register: (data: { name: string; email: string; password: string; referralCode?: string }) =>
    apiClient('/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiClient('/auth/login', { method: 'POST', body: data }),

  logout: () => {
    localStorage.removeItem('token');
    return Promise.resolve({ data: { success: true } });
  },

  // Password reset (code-based, no SMTP needed in dev — devCode returned)
  forgotPassword: (email: string) =>
    apiClient<{ message: string; devCode?: string }>(
      '/auth/forgot-password', { method: 'POST', body: { email } },
    ),
  resetPassword: (email: string, code: string, password: string) =>
    apiClient<{ success: boolean; message: string }>(
      '/auth/reset-password', { method: 'POST', body: { email, code, password } },
    ),

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

// Referral API
export interface ReferralMe {
  code: string;
  discountPct: number;
  stats: { clicks: number; signups: number; conversions: number; revenue: number };
  myDiscount: number;
  referredByCode: string | null;
  referrals: { id: string; status: string; amount: number | null; createdAt: string; convertedAt: string | null; name: string }[];
}
export interface ReferralValidation {
  valid: boolean;
  code?: string;
  discountPct?: number;
  type?: string;
  label?: string | null;
}
export const referralApi = {
  me: (token: string) => apiClient<ReferralMe>('/referrals/me', { token }),
  validate: (code: string) =>
    apiClient<ReferralValidation>('/referrals/validate', { method: 'POST', body: { code } }),
  track: (code: string) =>
    apiClient<{ ok: boolean }>('/referrals/track', { method: 'POST', body: { code } }),
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

// ===================== Olympiad API (олимпиадная подготовка) =====================

export type OlympiadLevel = 'SCHOOL' | 'DISTRICT' | 'REGION' | 'REPUBLIC';

export interface OlympiadSubjectRef {
  id: string; slug: string; name: string; icon: string | null; color: string | null;
}
export interface OlympiadMyState { solved: boolean; revealed: boolean; tries: number; pointsEarned?: number }
export interface OlympiadCard {
  id: string; title: string; subjectId: string; level: OlympiadLevel; difficulty: number;
  topic: string | null; grade: string | null; year: number | null; points: number; tags: string[];
  my: OlympiadMyState | null;
}
export interface OlympiadProblemFull {
  id: string; title: string; subjectId: string; content: string; level: OlympiadLevel;
  difficulty: number; topic: string | null; grade: string | null; year: number | null;
  points: number; tags: string[]; hints: string[]; source: string | null;
  answer?: string; solution?: string;
  subject?: OlympiadSubjectRef;
}
export interface OlympiadProgress {
  solved: number; totalProblems: number; points: number;
  byLevel: Record<OlympiadLevel, { total: number; solved: number }>;
  bySubject: Array<{ subject: OlympiadSubjectRef; total: number; solved: number; points: number }>;
}
export interface OlympiadArchiveYear {
  year: number;
  levels: Array<{ level: OlympiadLevel; total: number; subjects: Array<{ subject: OlympiadSubjectRef; count: number }> }>;
}
export interface OlympiadTheoryCard {
  id: string; subjectId: string; title: string; level: OlympiadLevel; topic: string | null;
  tags: string[]; order: number; preview: string; subject: OlympiadSubjectRef;
}
export interface UnlockedAchievement {
  id: string; name: string; description: string; icon: string; xp: number; rarity: string;
}

export const olympiadApi = {
  getProblems: (params: { subjectId?: string; level?: string; topic?: string; year?: number; q?: string; limit?: number; offset?: number }, token?: string) => {
    const qp = new URLSearchParams();
    if (params.subjectId) qp.append('subjectId', params.subjectId);
    if (params.level) qp.append('level', params.level);
    if (params.topic) qp.append('topic', params.topic);
    if (params.year) qp.append('year', String(params.year));
    if (params.q) qp.append('q', params.q);
    if (params.limit) qp.append('limit', String(params.limit));
    if (params.offset) qp.append('offset', String(params.offset));
    return apiClient<{ problems: OlympiadCard[]; total: number; limit: number; offset: number; facets: { topics: string[]; years: number[] } }>(
      `/olympiad/problems?${qp.toString()}`, { token },
    );
  },
  getProblem: (id: string, token?: string) =>
    apiClient<{ problem: OlympiadProblemFull; my: OlympiadMyState | null }>(`/olympiad/problems/${id}`, { token }),
  submitAnswer: (id: string, answer: string, token: string) =>
    apiClient<{ correct: boolean; alreadySolved?: boolean; pointsEarned?: number; tries?: number; problem?: OlympiadProblemFull; unlockedAchievements?: UnlockedAchievement[] }>(
      `/olympiad/problems/${id}/submit`, { method: 'POST', body: { answer }, token },
    ),
  revealSolution: (id: string, token: string) =>
    apiClient<{ problem: OlympiadProblemFull; my: OlympiadMyState }>(
      `/olympiad/problems/${id}/solution`, { method: 'POST', token },
    ),
  getArchive: (subjectId?: string) =>
    apiClient<{ years: OlympiadArchiveYear[] }>(`/olympiad/archive${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getLeaderboard: (token?: string) =>
    apiClient<{ leaderboard: Array<{ rank: number; userId: string; name: string; image: string | null; level: number; points: number; solved: number }>; me: { rank: number; points: number; solved: number } | null; totalParticipants: number }>(
      '/olympiad/leaderboard', { token },
    ),
  getProgress: (token: string) => apiClient<OlympiadProgress>('/olympiad/progress', { token }),
  getTheory: (params?: { subjectId?: string; level?: string; q?: string }) => {
    const qp = new URLSearchParams();
    if (params?.subjectId) qp.append('subjectId', params.subjectId);
    if (params?.level) qp.append('level', params.level);
    if (params?.q) qp.append('q', params.q);
    const qs = qp.toString();
    return apiClient<{ articles: OlympiadTheoryCard[] }>(`/olympiad/theory${qs ? `?${qs}` : ''}`);
  },
  getTheoryArticle: (id: string) =>
    apiClient<{ article: OlympiadTheoryCard & { content: string } }>(`/olympiad/theory/${id}`),
};

// Admin: олимпиадные задачи и теория
export const adminOlympiadApi = {
  getProblems: (params: { subjectId?: string; level?: string; q?: string; limit?: number; offset?: number }, token: string) => {
    const qp = new URLSearchParams();
    if (params.subjectId) qp.append('subjectId', params.subjectId);
    if (params.level) qp.append('level', params.level);
    if (params.q) qp.append('q', params.q);
    if (params.limit) qp.append('limit', String(params.limit));
    if (params.offset) qp.append('offset', String(params.offset));
    return apiClient<{ problems: Array<OlympiadProblemFull & { answer: string; solution: string; status: string; subject?: { id: string; slug: string; name: string } }>; total: number }>(
      `/admin/olympiad/problems?${qp.toString()}`, { token },
    );
  },
  createProblem: (data: Record<string, unknown>, token: string) =>
    apiClient('/admin/olympiad/problems', { method: 'POST', body: data, token }),
  updateProblem: (id: string, data: Record<string, unknown>, token: string) =>
    apiClient(`/admin/olympiad/problems/${id}`, { method: 'PATCH', body: data, token }),
  deleteProblem: (id: string, token: string) =>
    apiClient(`/admin/olympiad/problems/${id}`, { method: 'DELETE', token }),
  bulkProblems: (ids: string[], op: 'delete' | 'update', data: Record<string, unknown> | undefined, token: string) =>
    apiClient<{ success: boolean; count: number }>('/admin/olympiad/problems/bulk', { method: 'POST', body: { ids, op, data }, token }),
  getTheory: (params: { subjectId?: string; q?: string }, token: string) => {
    const qp = new URLSearchParams();
    if (params.subjectId) qp.append('subjectId', params.subjectId);
    if (params.q) qp.append('q', params.q);
    return apiClient<{ articles: Array<OlympiadTheoryCard & { content: string; status: string }> }>(
      `/admin/olympiad/theory?${qp.toString()}`, { token },
    );
  },
  createTheory: (data: Record<string, unknown>, token: string) =>
    apiClient('/admin/olympiad/theory', { method: 'POST', body: data, token }),
  updateTheory: (id: string, data: Record<string, unknown>, token: string) =>
    apiClient(`/admin/olympiad/theory/${id}`, { method: 'PATCH', body: data, token }),
  deleteTheory: (id: string, token: string) =>
    apiClient(`/admin/olympiad/theory/${id}`, { method: 'DELETE', token }),
};

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  oldValue: string | null;
  newValue: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogQuery {
  entity?: string; action?: string; actor?: string; q?: string;
  from?: string; to?: string; limit?: number; offset?: number;
}

const auditQueryString = (params: AuditLogQuery): string => {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qp.append(k, String(v));
  }
  return qp.toString();
};

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (token: string) =>
    apiClient<{ notifications: NotificationRow[]; unreadCount: number }>('/notifications', { token }),
  markRead: (params: { ids?: string[]; all?: boolean }, token: string) =>
    apiClient<{ success: boolean; count: number }>('/notifications', { method: 'PATCH', body: params, token }),
};

export const adminAuditApi = {
  list: (params: AuditLogQuery, token: string) =>
    apiClient<{ logs: AuditLogRow[]; total: number; limit: number; offset: number; facets: { entities: string[]; actions: string[] } }>(
      `/admin/audit?${auditQueryString(params)}`, { token },
    ),
  exportCsvUrl: (params: AuditLogQuery) =>
    `${API_BASE_URL}/admin/audit?${auditQueryString({ ...params, limit: 5000 })}&format=csv`,
};

export interface OlympiadOverview {
  totalProblems: number;
  theoryCount: number;
  byLevel: Record<OlympiadLevel, number>;
  subjects: Array<{ subject: OlympiadSubjectRef & { order?: number }; total: number; byLevel: Partial<Record<OlympiadLevel, number>> }>;
}
export const olympiadOverviewApi = {
  get: () => apiClient<OlympiadOverview>('/olympiad/overview'),
};

// История практики (личный кабинет, вкладка «Практика»)
export interface PracticeHistoryItem {
  id: string; questionId: string; isCorrect: boolean; timeSpent: number; createdAt: string;
  preview: string; part: string | null; topic: string | null;
  subject: { name: string; slug: string; color: string | null } | null;
}
export const practiceHistoryApi = {
  get: (token: string, limit = 20, offset = 0) =>
    apiClient<{ total: number; limit: number; offset: number; items: PracticeHistoryItem[] }>(
      `/users/progress?limit=${limit}&offset=${offset}`, { token },
    ),
};

// ===================== Admin: рефералы =====================
export interface AdminReferralCode {
  id: string; code: string; type: string; label: string | null; discountPct: number;
  active: boolean; clicks: number; signups: number; conversions: number; revenue: number;
  owner: { id: string; name: string | null; email: string } | null; createdAt: string;
}
export interface AdminReferralList {
  total: number; items: AdminReferralCode[];
  facets: { type: Record<string, number> };
  totals: { clicks: number; signups: number; conversions: number; revenue: number };
}
export interface AdminReferralQuery {
  q?: string; type?: string; active?: string; sort?: string; limit?: number; offset?: number;
}
function refQueryString(p: AdminReferralQuery): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set('q', p.q);
  if (p.type) sp.set('type', p.type);
  if (p.active) sp.set('active', p.active);
  if (p.sort) sp.set('sort', p.sort);
  if (p.limit != null) sp.set('limit', String(p.limit));
  if (p.offset != null) sp.set('offset', String(p.offset));
  return sp.toString();
}
export const adminReferralApi = {
  list: (params: AdminReferralQuery, token: string) =>
    apiClient<AdminReferralList>(`/admin/referrals?${refQueryString(params)}`, { token }),
  detail: (id: string, token: string) =>
    apiClient<{ code: AdminReferralCode; referrals: { id: string; status: string; amount: number | null; createdAt: string; convertedAt: string | null; user: { id: string; name: string | null; email: string; plan: string } | null }[] }>(
      `/admin/referrals/${id}`, { token }),
  create: (data: { code?: string; label?: string; type?: string; discountPct?: number; active?: boolean }, token: string) =>
    apiClient<AdminReferralCode>('/admin/referrals', { method: 'POST', body: data, token }),
  update: (id: string, data: { label?: string | null; discountPct?: number; active?: boolean }, token: string) =>
    apiClient<AdminReferralCode>(`/admin/referrals/${id}`, { method: 'PATCH', body: data, token }),
  remove: (id: string, token: string) =>
    apiClient<{ success: boolean }>(`/admin/referrals/${id}`, { method: 'DELETE', token }),
};

// ===================== Admin: финансы и онлайн =====================
export interface AdminFinance {
  online: { now: number; activeToday: number; activeWeek: number };
  users: { total: number; premium: number; free: number; newToday: number; newWeek: number; newMonth: number; conversionRate: number };
  revenue: { total: number; today: number; week: number; month: number; payments: number; activeSubscriptions: number; byPlan: Record<string, number>; arpu: number };
  referrals: { codes: number; bloggerCodes: number; clicks: number; signups: number; conversions: number; revenue: number; signupShare: number };
  series: { date: string; revenue: number; payments: number; registrations: number }[];
}
export const adminFinanceApi = {
  get: (token: string) => apiClient<AdminFinance>('/admin/finance', { token }),
};
