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

/** Юридические документы */
const TermsPage = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const TheorySearchPage = lazy(() => import('@/pages/TheorySearchPage').then(m => ({ default: m.TheorySearchPage })));

/** Единый каталог теории по всем предметам */
const TheoryHubPage = lazy(() => import('@/pages/TheoryHubPage').then(m => ({ default: m.TheoryHubPage })));

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
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Загрузка...</p>
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
              {/* Единый каталог теории по всем предметам (static path — выше динамического /theory/:slug) */}
              <Route path="/theory" element={<TheoryHubPage />} />
              <Route path="/theory/:slug/:topicId?" element={<TheoryPage />} />

              {/* 
                АУТЕНТИФИКАЦИЯ 
                Отдельные чанки для страниц входа/регистрации
              */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* 
                ПРОФИЛЬ И ДОСТИЖЕНИЯ 
              */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />

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
              <Route path="/theory/search" element={<TheorySearchPage />} />

              {/* 
                404 - СТРАНИЦА НЕ НАЙДЕНА 
              */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-muted-foreground mb-4">Страница не найдена</p>
                    {/* 
                      ССЫЛКА: Вернуться на главную страницу
                      URL: /
                    */}
                    <Link to="/" className="text-primary hover:underline">
                      Вернуться на главную
                    </Link>
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
