/**
 * Главный компонент приложения CT-Platform
 *
 * Настраивает роутинг, провайдеры и глобальное состояние
 * Использует lazy loading для оптимизации производительности
 *
 * Ссылки на внешние ресурсы:
 * - Backend API: http://localhost:3000/api (или VITE_API_URL)
 * - Документация API: /api/docs
 * - Поддержка: support@ct-platform.by
 */

import { Suspense, lazy, Component, useEffect, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { MembersOnly } from '@/components/MembersOnly';
import { HomePage } from '@/pages/HomePage';
import './App.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Unhandled error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Что-то пошло не так</h1>
            <p className="text-muted-foreground mb-4">Произошла непредвиденная ошибка</p>
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg"
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            >
              На главную
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =====================================================
// LAZY LOADING - динамический импорт страниц
// Это уменьшает начальный размер бандла и ускоряет
// загрузку приложения
// =====================================================

/** Страница предмета - загружается при переходе к предмету */
const SubjectPage = lazy(() => import('@/pages/SubjectPage').then(m => ({ default: m.SubjectPage })));

/** Страница практики - загружается при начале практики */
const PracticePage = lazy(() => import('@/pages/PracticePage').then(m => ({ default: m.PracticePage })));

/** Страница экзамена - загружается при начале экзамена */
const ExamPage = lazy(() => import('@/pages/ExamPage').then(m => ({ default: m.ExamPage })));

/** Список пробных экзаменов по предмету */
const ExamListPage = lazy(() => import('@/pages/ExamListPage').then(m => ({ default: m.ExamListPage })));

/** Страницы аутентификации */
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

/** Подтверждение email 6-значным кодом */
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

/** Страница профиля пользователя */
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

/** Страница теории по предмету */
const TheoryPage = lazy(() => import('@/pages/TheoryPage').then(m => ({ default: m.TheoryPage })));

/** Админ-панель - загружается только для администраторов */
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));

/** Страница достижений */
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));

/** Таблица лидеров */
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const NewsFeedPage = lazy(() => import('@/pages/NewsPage').then(m => ({ default: m.NewsFeedPage })));
const NewsArticlePage = lazy(() => import('@/pages/NewsPage').then(m => ({ default: m.NewsArticlePage })));

/** Юридические документы */
const TermsPage = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const TheorySearchPage = lazy(() => import('@/pages/TheorySearchPage').then(m => ({ default: m.TheorySearchPage })));

/** Единый каталог теории по всем предметам */
const TheoryHubPage = lazy(() => import('@/pages/TheoryHubPage').then(m => ({ default: m.TheoryHubPage })));

/** Страница оплаты Premium-подписки */
const PaymentPage = lazy(() => import('@/pages/PaymentPage').then(m => ({ default: m.PaymentPage })));

/** Олимпиадная подготовка — отдельный раздел (хаб, задачи, архив, теория PRO, рейтинг, гид) */
const OlympiadHubPage = lazy(() => import('@/pages/olympiad/OlympiadHubPage').then(m => ({ default: m.OlympiadHubPage })));
const OlympiadProblemsPage = lazy(() => import('@/pages/olympiad/OlympiadProblemsPage').then(m => ({ default: m.OlympiadProblemsPage })));
const OlympiadProblemPage = lazy(() => import('@/pages/olympiad/OlympiadProblemPage').then(m => ({ default: m.OlympiadProblemPage })));
const OlympiadArchivePage = lazy(() => import('@/pages/olympiad/OlympiadArchivePage').then(m => ({ default: m.OlympiadArchivePage })));
const OlympiadTheoryPage = lazy(() => import('@/pages/olympiad/OlympiadTheoryPage').then(m => ({ default: m.OlympiadTheoryPage })));
const OlympiadTheoryArticlePage = lazy(() => import('@/pages/olympiad/OlympiadTheoryPage').then(m => ({ default: m.OlympiadTheoryArticlePage })));
const OlympiadLeaderboardPage = lazy(() => import('@/pages/olympiad/OlympiadLeaderboardPage').then(m => ({ default: m.OlympiadLeaderboardPage })));
const OlympiadGuidePage = lazy(() => import('@/pages/olympiad/OlympiadGuidePage').then(m => ({ default: m.OlympiadGuidePage })));

/** Секретная демо-страница «Рулетка» (виртуальные монеты, без реальных денег) */
const RoulettePage = lazy(() => import('@/pages/RoulettePage').then(m => ({ default: m.RoulettePage })));

/** Секретная демо-страница «Блэкджек» (виртуальные бриллианты, без реальных денег) */
const BlackjackPage = lazy(() => import('@/pages/BlackjackPage').then(m => ({ default: m.BlackjackPage })));

// =====================================================
// КОНФИГУРАЦИЯ REACT QUERY
// =====================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Данные считаются свежими 5 минут
      retry: 1, // Повторная попытка при ошибке
    },
  },
});

// =====================================================
// КОМПОНЕНТ ЗАГРУЗКИ ДЛЯ SUSPENSE
// =====================================================

/**
 * Компонент-заглушка, отображается во время загрузки lazy-компонента
 */
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Загрузка страницы">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-violet-600 opacity-20 animate-ping" />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/30 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Загружаем…</p>
      </div>
    </div>
  );
}

// =====================================================
// ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// =====================================================

/** Сбрасывает прокрутку наверх при смене маршрута (иначе новая страница открывается прокрученной). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [pathname]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Router>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* 
                Главная страница - загружается сразу 
                (не lazy-loaded для быстрого первого рендера)
              */}
              <Route path="/" element={<HomePage />} />

              {/* 
                СТРАНИЦЫ ПРЕДМЕТОВ 
                Lazy-loaded для уменьшения начального бандла
              */}
              <Route path="/subject/:slug" element={<SubjectPage />} />
              <Route path="/practice/:slug" element={<PracticePage />} />
              <Route path="/exam/:slug" element={<ExamListPage />} />
              <Route path="/exam/:slug/:examId" element={<ExamPage />} />
              {/* Теория — только для зарегистрированных с подтверждённым email */}
              {/* Единый каталог теории по всем предметам (static path — выше динамического /theory/:slug) */}
              <Route path="/theory" element={<MembersOnly feature="Каталог теории"><TheoryHubPage /></MembersOnly>} />
              <Route path="/theory/:slug/:topicId?" element={<MembersOnly feature="Теория"><TheoryPage /></MembersOnly>} />

              {/* ОЛИМПИАДНАЯ ПОДГОТОВКА — отдельный раздел.
                  Каталог и задачи открыты для просмотра (решение гейтится requireAuth),
                  теория PRO — members-only, как и базовая теория. */}
              <Route path="/olympiad" element={<OlympiadHubPage />} />
              <Route path="/olympiad/tasks" element={<OlympiadProblemsPage />} />
              <Route path="/olympiad/problem/:id" element={<OlympiadProblemPage />} />
              <Route path="/olympiad/archive" element={<OlympiadArchivePage />} />
              <Route path="/olympiad/theory" element={<MembersOnly feature="Теория повышенного уровня"><OlympiadTheoryPage /></MembersOnly>} />
              <Route path="/olympiad/theory/:id" element={<MembersOnly feature="Теория повышенного уровня"><OlympiadTheoryArticlePage /></MembersOnly>} />
              <Route path="/olympiad/rating" element={<OlympiadLeaderboardPage />} />
              <Route path="/olympiad/guide" element={<OlympiadGuidePage />} />

              {/* 
                АУТЕНТИФИКАЦИЯ 
                Отдельные чанки для страниц входа/регистрации
              */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* 
                ПРОФИЛЬ И ДОСТИЖЕНИЯ 
              */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/news" element={<NewsFeedPage />} />
              <Route path="/news/:id" element={<NewsArticlePage />} />

              {/* 
                АДМИН-ПАНЕЛЬ 
                Тяжёлый компонент, загружается только при необходимости
              */}
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/:tab" element={<AdminPage />} />

              {/* 
                ЮРИДИЧЕСКИЕ ДОКУМЕНТЫ 
              */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/theory/search" element={<MembersOnly feature="Поиск по теории"><TheorySearchPage /></MembersOnly>} />

              {/* Оплата Premium-подписки */}
              <Route path="/payment" element={<PaymentPage />} />

              {/* Секретные демо-игры (ссылки спрятаны в подвале) */}
              <Route path="/roulette" element={<RoulettePage />} />
              <Route path="/рулетка" element={<RoulettePage />} />
              <Route path="/blackjack" element={<BlackjackPage />} />
              <Route path="/блэкджек" element={<BlackjackPage />} />

              {/* 
                404 - СТРАНИЦА НЕ НАЙДЕНА 
              */}
              <Route path="*" element={
                <div className="min-h-[70vh] flex items-center justify-center px-4">
                  <div className="text-center max-w-md">
                    <p className="text-[7rem] leading-none font-extrabold text-gradient-animated select-none" aria-hidden>404</p>
                    <h1 className="text-xl font-bold mb-2">Такой страницы нет</h1>
                    <p className="text-muted-foreground mb-6">
                      Возможно, ссылка устарела или в адресе опечатка. Зато задания на месте — выбирайте, куда дальше.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Link to="/" className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors">
                        На главную
                      </Link>
                      <Link to="/theory" className="inline-flex items-center h-10 px-5 rounded-lg border bg-background font-semibold hover:bg-muted transition-colors">
                        Теория
                      </Link>
                      <Link to="/olympiad" className="inline-flex items-center h-10 px-5 rounded-lg border bg-background font-semibold hover:bg-muted transition-colors">
                        Олимпиады
                      </Link>
                    </div>
                  </div>
                </div>
              } />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
