import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, userApi } from '@/lib/api/client';
import type { Subject, User, UserStats, PracticeSession, Achievement } from '@/types';

// Gamification types
interface GamificationState {
  level: number;
  xp: number;
  totalXp: number;
  streakDays: number;
  lastStudyDate: string | null;
  achievements: Achievement[];
  badges: string[];
}

interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // User
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string; devCode?: string; needsVerification?: boolean }>;
  logout: () => void;
  
  // Navigation
  currentSubject: Subject | null;
  setCurrentSubject: (subject: Subject | null) => void;
  
  // Practice
  currentSession: PracticeSession | null;
  setCurrentSession: (session: PracticeSession | null) => void;
  
  // Stats
  userStats: UserStats | null;
  setUserStats: (stats: UserStats | null) => void;
  fetchUserStats: () => Promise<void>;
  
  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Desktop workspace preferences (persisted) — power the collapsible panels
  // and distraction-free Focus mode in practice / exam.
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  practiceSidebarCollapsed: boolean;
  setPracticeSidebarCollapsed: (value: boolean) => void;
  examSidebarCollapsed: boolean;
  setExamSidebarCollapsed: (value: boolean) => void;

  // Theory favorites (client-side, persisted) — used by the unified Theory hub.
  favoriteTheory: string[];
  toggleFavoriteTheory: (id: string) => void;

  // Favorites
  favorites: string[];
  addFavorite: (questionId: string) => Promise<void>;
  removeFavorite: (questionId: string) => Promise<void>;
  toggleFavorite: (questionId: string) => void;
  fetchFavorites: () => Promise<void>;
  
  // Recent questions
  recentQuestions: string[];
  addRecentQuestion: (questionId: string) => void;
  
  // Solved questions - хранит ID решенных заданий и результат
  solvedQuestions: Array<{ questionId: string; isCorrect: boolean; solvedAt: string }>;
  // Накопительный счётчик когда-либо решённых заданий — для разблокировки игр.
  // НЕ обнуляется сбросом прогресса (иначе рулетка/блэкджек снова бы блокировались).
  gamesProgressCount: number;
  addSolvedQuestion: (questionId: string, isCorrect: boolean) => void;
  isQuestionSolved: (questionId: string) => boolean;
  getQuestionResult: (questionId: string) => boolean | null;
  /** Полный сброс локального прогресса (решённые, недавние, геймификация). */
  clearLocalProgress: () => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  
  // Gamification
  gamification: GamificationState;
  addXp: (amount: number) => void;
  checkStreak: () => void;
  unlockAchievement: (achievementId: string) => void;
  
  // Reported questions
  reportedQuestions: string[];
  reportQuestion: (questionId: string) => void;
  
  // Premium
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;

  // Auth gate — registration wall for guests. Any action that requires an account
  // calls requireAuth(); when not signed in it opens a modal prompting registration.
  authGateOpen: boolean;
  authGateMessage: string | null;
  openAuthGate: (message?: string) => void;
  closeAuthGate: () => void;
  /** Returns true when signed in. Otherwise opens the registration gate and returns false. */
  requireAuth: (message?: string) => boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Default achievements
const defaultAchievements: Achievement[] = [
  { id: 'first-step', name: 'Первые шаги', description: 'Решите первое задание', icon: '🎯', unlocked: false, xp: 10 },
  { id: 'beginner', name: 'Новичок', description: 'Решите 10 заданий', icon: '📚', unlocked: false, xp: 25 },
  { id: 'student', name: 'Ученик', description: 'Решите 50 заданий', icon: '✏️', unlocked: false, xp: 50 },
  { id: 'marathoner', name: 'Марафонец', description: 'Решите 100 заданий', icon: '🏃', unlocked: false, xp: 100 },
  { id: 'streak-3', name: 'На старте', description: '3 дня подряд', icon: '🔥', unlocked: false, xp: 15 },
  { id: 'streak-7', name: 'Недельный марафон', description: '7 дней подряд', icon: '⚡', unlocked: false, xp: 50 },
  { id: 'accuracy-80', name: 'Знаток', description: 'Достигните 80% точности', icon: '🧠', unlocked: false, xp: 75 },
  { id: 'exam-first', name: 'Первая проба', description: 'Пройдите первый пробный экзамен', icon: '📝', unlocked: false, xp: 20 },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      // User
      user: null,
      token: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      isAuthenticated: false,
      
      // Auth actions
      login: async (email, password) => {
        const result = await authApi.login({ email, password });
        
        if (result.error) {
          return { success: false, error: result.error };
        }
        
        const data = result.data as { token: string; user: User } | undefined;
        if (data?.token) {
          set({ 
            user: data.user, 
            token: data.token,
            isAuthenticated: true 
          });
          localStorage.setItem('token', data.token);
          return { success: true };
        }
        
        return { success: false, error: 'Ошибка авторизации' };
      },
      
      register: async (name, email, password, referralCode) => {
        const result = await authApi.register({ name, email, password, referralCode });

        if (result.error) {
          return { success: false, error: result.error };
        }

        const data = result.data as { devCode?: string; needsVerification?: boolean } | undefined;
        // Авто-вход после регистрации: выдаёт токен сессии (пользователь ещё НЕ
        // подтверждён — emailVerified=null), чтобы он мог ввести код на /verify-email.
        const loginRes = await get().login(email, password);
        return { ...loginRes, devCode: data?.devCode, needsVerification: data?.needsVerification ?? true };
      },
      
      logout: () => {
        authApi.logout();
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          favorites: [],
          userStats: null,
        });
      },
      
      // Navigation
      currentSubject: null,
      setCurrentSubject: (subject) => set({ currentSubject: subject }),
      
      // Practice
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),
      
      // Stats
      userStats: null,
      setUserStats: (stats) => set({ userStats: stats }),
      fetchUserStats: async () => {
        const { token } = get();
        if (!token) return;
        
        const result = await userApi.getStats(token);
        if (result.data) {
          set({ userStats: result.data as UserStats });
        }
      },
      
      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Desktop workspace preferences
      focusMode: false,
      setFocusMode: (value) => set({ focusMode: value }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      practiceSidebarCollapsed: false,
      setPracticeSidebarCollapsed: (value) => set({ practiceSidebarCollapsed: value }),
      examSidebarCollapsed: false,
      setExamSidebarCollapsed: (value) => set({ examSidebarCollapsed: value }),

      favoriteTheory: [],
      toggleFavoriteTheory: (id) => set((state) => ({
        favoriteTheory: state.favoriteTheory.includes(id)
          ? state.favoriteTheory.filter((x) => x !== id)
          : [...state.favoriteTheory, id],
      })),

      // Favorites
      favorites: [],
      addFavorite: async (questionId) => {
        const { token, favorites } = get();
        if (!token || favorites.includes(questionId)) return;
        
        const result = await userApi.addFavorite(questionId, token);
        if (!result.error) {
          set({ favorites: [...favorites, questionId] });
        }
      },
      removeFavorite: async (questionId) => {
        const { token, favorites } = get();
        if (!token) return;
        
        const result = await userApi.removeFavorite(questionId, token);
        if (!result.error) {
          set({ favorites: favorites.filter((id) => id !== questionId) });
        }
      },
      toggleFavorite: (questionId) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.includes(questionId)) {
          removeFavorite(questionId);
        } else {
          addFavorite(questionId);
        }
      },
      fetchFavorites: async () => {
        const { token } = get();
        if (!token) return;
        
        const result = await userApi.getFavorites(token);
        if (result.data) {
          set({ favorites: (result.data as Array<{ questionId: string }>).map((f) => f.questionId) });
        }
      },
      
      // Recent questions
      recentQuestions: [],
      addRecentQuestion: (questionId) => {
        const { recentQuestions } = get();
        const filtered = recentQuestions.filter((id) => id !== questionId);
        set({ recentQuestions: [questionId, ...filtered].slice(0, 20) });
      },
      
      // Solved questions - отслеживание решенных заданий
      solvedQuestions: [],
      gamesProgressCount: 0,
      addSolvedQuestion: (questionId, isCorrect) => {
        const { solvedQuestions, gamesProgressCount, addXp, unlockAchievement, checkStreak } = get();

        // Проверяем, не решено ли уже это задание
        const alreadySolved = solvedQuestions.find(q => q.questionId === questionId);

        if (!alreadySolved) {
          const newSolved = {
            questionId,
            isCorrect,
            solvedAt: new Date().toISOString(),
          };

          // Накопительный счётчик для разблокировки игр растёт всегда (и переживает сброс).
          set({ solvedQuestions: [...solvedQuestions, newSolved], gamesProgressCount: gamesProgressCount + 1 });
          
          // Начисляем XP за решение
          addXp(isCorrect ? 10 : 2);
          
          // Обновляем streak
          checkStreak();
          
          // Проверяем достижения
          const totalSolved = solvedQuestions.length + 1;
          if (totalSolved >= 1) unlockAchievement('first-step');
          if (totalSolved >= 10) unlockAchievement('beginner');
          if (totalSolved >= 50) unlockAchievement('student');
          if (totalSolved >= 100) unlockAchievement('marathoner');
        }
      },
      isQuestionSolved: (questionId) => {
        const { solvedQuestions } = get();
        return solvedQuestions.some(q => q.questionId === questionId);
      },
      getQuestionResult: (questionId) => {
        const { solvedQuestions } = get();
        const solved = solvedQuestions.find(q => q.questionId === questionId);
        return solved ? solved.isCorrect : null;
      },
      clearLocalProgress: () => set({
        solvedQuestions: [],
        recentQuestions: [],
        gamification: {
          level: 1, xp: 0, totalXp: 0, streakDays: 0,
          lastStudyDate: null, achievements: defaultAchievements, badges: [],
        },
      }),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(7);
        const { notifications } = get();
        set({ notifications: [...notifications, { ...notification, id }] });
        
        const duration = notification.duration || 5000;
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      },
      removeNotification: (id) => {
        const { notifications } = get();
        set({ notifications: notifications.filter((n) => n.id !== id) });
      },
      
      // Gamification
      gamification: {
        level: 1,
        xp: 0,
        totalXp: 0,
        streakDays: 0,
        lastStudyDate: null,
        achievements: defaultAchievements,
        badges: [],
      },
      
      addXp: (amount) => {
        const { gamification, addNotification } = get();
        const newXp = gamification.xp + amount;
        const newTotalXp = gamification.totalXp + amount;
        const xpNeeded = gamification.level * 100;
        
        if (newXp >= xpNeeded) {
          const newLevel = gamification.level + 1;
          set({
            gamification: {
              ...gamification,
              level: newLevel,
              xp: newXp - xpNeeded,
              totalXp: newTotalXp,
            },
          });
          addNotification({
            type: 'success',
            title: `Уровень ${newLevel}!`,
            message: `Поздравляем! Вы достигли уровня ${newLevel}`,
            duration: 5000,
          });
        } else {
          set({
            gamification: {
              ...gamification,
              xp: newXp,
              totalXp: newTotalXp,
            },
          });
        }
      },
      
      checkStreak: () => {
        const { gamification } = get();
        const today = new Date().toISOString().split('T')[0];
        const lastDate = gamification.lastStudyDate;
        
        if (!lastDate) {
          set({
            gamification: {
              ...gamification,
              streakDays: 1,
              lastStudyDate: today,
            },
          });
          return;
        }
        
        const last = new Date(lastDate);
        const now = new Date(today);
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          set({
            gamification: {
              ...gamification,
              streakDays: gamification.streakDays + 1,
              lastStudyDate: today,
            },
          });
        } else if (diffDays > 1) {
          set({
            gamification: {
              ...gamification,
              streakDays: 1,
              lastStudyDate: today,
            },
          });
        }
      },
      
      unlockAchievement: (achievementId) => {
        const { gamification, addXp, addNotification } = get();
        const achievement = gamification.achievements.find(a => a.id === achievementId);
        
        if (achievement && !achievement.unlocked) {
          const updatedAchievements = gamification.achievements.map(a =>
            a.id === achievementId ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
          );
          
          set({
            gamification: {
              ...gamification,
              achievements: updatedAchievements,
            },
          });
          
          addXp(achievement.xp);
          addNotification({
            type: 'success',
            title: 'Достижение разблокировано!',
            message: `${achievement.name}: ${achievement.description}`,
            duration: 5000,
          });
        }
      },
      
      // Reported questions
      reportedQuestions: [],
      reportQuestion: (questionId) => {
        const { reportedQuestions, addNotification } = get();
        if (!reportedQuestions.includes(questionId)) {
          set({ reportedQuestions: [...reportedQuestions, questionId] });
          addNotification({
            type: 'success',
            title: 'Задание отправлено на разбор',
            message: 'Спасибо! Мы рассмотрим вашу заявку',
          });
        }
      },
      
      // Premium
      isPremium: false,
      setIsPremium: (value) => set({ isPremium: value }),

      // Auth gate
      authGateOpen: false,
      authGateMessage: null,
      openAuthGate: (message) => set({ authGateOpen: true, authGateMessage: message ?? null }),
      closeAuthGate: () => set({ authGateOpen: false, authGateMessage: null }),
      requireAuth: (message) => {
        const { user, token } = get();
        const signedIn = !!user || !!token;
        if (!signedIn) {
          set({ authGateOpen: true, authGateMessage: message ?? null });
          return false;
        }
        // Зарегистрирован, но email не подтверждён — тоже не пускаем
        // (AuthGateModal покажет вариант с подтверждением почты).
        if (user && !user.emailVerified) {
          set({ authGateOpen: true, authGateMessage: message ?? null });
          return false;
        }
        return true;
      },
    }),
    {
      name: 'ct-platform-storage',
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        token: state.token,
        favorites: state.favorites,
        recentQuestions: state.recentQuestions,
        solvedQuestions: state.solvedQuestions,
        gamesProgressCount: state.gamesProgressCount,
        gamification: state.gamification,
        reportedQuestions: state.reportedQuestions,
        isPremium: state.isPremium,
        // Remember the user's collapsed-panel layout across sessions.
        // (focusMode is intentionally NOT persisted so reloads start un-focused.)
        practiceSidebarCollapsed: state.practiceSidebarCollapsed,
        examSidebarCollapsed: state.examSidebarCollapsed,
        favoriteTheory: state.favoriteTheory,
      }),
      // isAuthenticated isn't persisted (derived state); restore it from the saved
      // token so a page reload doesn't log the user out of the UI.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token;
          // Grandfather: у существующих пользователей счётчик игр = число решённых.
          if (!state.gamesProgressCount) state.gamesProgressCount = state.solvedQuestions?.length || 0;
        }
      },
    }
  )
);

// Глобальное восстановление при недействительном/просроченном токене.
// Любой авторизованный запрос, получивший 401, шлёт 'auth:unauthorized' (см. apiClient).
// Мы вычищаем сессию и предлагаем войти заново — иначе пользователь застревал бы на
// ошибках «Недействительный токен» / «Не удалось сохранить ответ» без выхода.
if (typeof window !== 'undefined' && !(window as unknown as { __ctAuthListener?: boolean }).__ctAuthListener) {
  (window as unknown as { __ctAuthListener?: boolean }).__ctAuthListener = true;
  let lastReset = 0;
  window.addEventListener('auth:unauthorized', () => {
    const now = Date.now();
    if (now - lastReset < 3000) return; // гасим всплеск параллельных 401
    lastReset = now;
    const s = useAppStore.getState();
    if (!s.token && !s.user) return; // уже не авторизованы
    s.logout();
    s.addNotification({
      type: 'error',
      title: 'Сессия истекла',
      message: 'Войдите снова, чтобы продолжить.',
      duration: 6000,
    });
    s.openAuthGate('Сессия истекла. Войдите снова, чтобы продолжить.');
  });
}

// Practice store for active practice session
interface PracticeState {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  timeSpent: number;
  isPaused: boolean;
  showExplanation: boolean;
  
  setCurrentQuestionIndex: (index: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  incrementTime: () => void;
  togglePause: () => void;
  setShowExplanation: (show: boolean) => void;
  reset: () => void;
}

export const usePracticeStore = create<PracticeState>()((set) => ({
  currentQuestionIndex: 0,
  answers: {},
  timeSpent: 0,
  isPaused: false,
  showExplanation: false,
  
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    })),
  incrementTime: () =>
    set((state) => ({ timeSpent: state.timeSpent + 1 })),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setShowExplanation: (show) => set({ showExplanation: show }),
  reset: () =>
    set({
      currentQuestionIndex: 0,
      answers: {},
      timeSpent: 0,
      isPaused: false,
      showExplanation: false,
    }),
}));

// Exam store for active exam
interface ExamState {
  attemptId: string | null;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  timeRemaining: number;
  isPaused: boolean;
  isCompleted: boolean;
  
  setAttemptId: (id: string | null) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  decrementTime: () => void;
  togglePause: () => void;
  completeExam: () => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>()((set) => ({
  attemptId: null,
  currentQuestionIndex: 0,
  answers: {},
  timeRemaining: 0,
  isPaused: false,
  isCompleted: false,
  
  setAttemptId: (id) => set({ attemptId: id }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    })),
  decrementTime: () =>
    set((state) => ({ timeRemaining: Math.max(0, state.timeRemaining - 1) })),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  completeExam: () => set({ isCompleted: true }),
  reset: () =>
    set({
      attemptId: null,
      currentQuestionIndex: 0,
      answers: {},
      timeRemaining: 0,
      isPaused: false,
      isCompleted: false,
    }),
}));
