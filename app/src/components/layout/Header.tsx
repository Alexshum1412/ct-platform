import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, User, Menu, X, Sun, Moon, ChevronDown,
  LogOut, Settings, BarChart3, Award, Star, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/useAppStore';
import { subjects } from '@/data/subjects';
import { NotificationBell } from '@/components/NotificationBell';

/**
 * Получить количество онлайн-пользователей с API
 * 
 * ССЫЛКА: GET /api/stats/online
 * 
 * Примечание: Время суток учитывается на backend
 * для более точной оценки нагрузки
 */
async function fetchOnlineUsers(): Promise<number> {
  try {
    const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';
    const response = await fetch(`${API_BASE_URL}/stats/online`, {
      // Кешируем на 30 секунд
      cache: 'no-cache',
    });
    if (!response.ok) throw new Error('Failed to fetch online users');
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error fetching online users:', error);
    return 0;
  }
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme, user, isAuthenticated, setUser, focusMode } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Загружаем и обновляем количество онлайн-пользователей
  useEffect(() => {
    // Первоначальная загрузка
    fetchOnlineUsers().then(setOnlineUsers);
    
    // Обновление каждые 30 секунд
    const interval = setInterval(() => {
      fetchOnlineUsers().then(setOnlineUsers);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Track scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  // Distraction-free Focus mode (practice/exam) hides the global header entirely.
  if (focusMode) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border' 
          : 'bg-background'
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-md shadow-primary/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">CT-Platform</span>
          </Link>

          {/* ================================================= */}
          {/* НАВИГАЦИЯ ПО ПРЕДМЕТАМ - ДЕСКТОП                   */}
          {/* Показываем полные названия предметов без сокращений */}
          {/* ================================================= */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/?scroll=subjects"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  document.getElementById('subjects-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                location.pathname === '/'
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Главная
            </Link>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1">
                  Предметы
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {subjects.map((subject) => (
                  <DropdownMenuItem key={subject.id} asChild>
                    <Link to={`/subject/${subject.slug}`} className="cursor-pointer flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: subject.color }}
                      />
                      {subject.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/theory" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive('/theory') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
              Теория
            </Link>
            <Link to="/olympiad" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive('/olympiad') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
              Олимпиады
            </Link>
            <Link to="/leaderboard" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive('/leaderboard') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
              Рейтинг
            </Link>
            <Link to="/news" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive('/news') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
              Новости
            </Link>
            <Link to="/contact" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive('/contact') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
              Контакты
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Online Users */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="font-medium">{onlineUsers}</span>
              <span className="text-muted-foreground">онлайн</span>
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="shrink-0"
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.image} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                      {user.name || user.email}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.name || 'Пользователь'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Профиль
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Статистика
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites" className="cursor-pointer">
                      <Star className="w-4 h-4 mr-2" />
                      Избранное
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/achievements" className="cursor-pointer">
                      <Award className="w-4 h-4 mr-2" />
                      Достижения
                    </Link>
                  </DropdownMenuItem>
                  {user.plan === 'FREE' && (
                    <DropdownMenuItem asChild className="cursor-pointer text-amber-600 dark:text-amber-400">
                      <Link to="/payment">
                        <Crown className="w-4 h-4 mr-2" />
                        Получить Premium
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'ADMIN' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Админ-панель
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="hidden sm:flex"
                >
                  Войти
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  Регистрация
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Открыть меню"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* МОБИЛЬНОЕ МЕНЮ                                  */}
      {/* ================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border bg-background max-h-[calc(100dvh-4rem)] overflow-y-auto"
          >
            <nav className="container py-4 pb-24 space-y-2">
              {[
                { to: '/', label: 'Главная' },
                { to: '/theory', label: 'Теория' },
                { to: '/olympiad', label: 'Олимпиады' },
                { to: '/leaderboard', label: 'Рейтинг' },
                { to: '/news', label: 'Новости' },
                { to: '/favorites', label: 'Избранное' },
                { to: '/achievements', label: 'Достижения' },
                { to: '/contact', label: 'Контакты' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive(to) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border mt-2">
                <p className="text-xs font-semibold text-muted-foreground px-4 mb-2">ПРЕДМЕТЫ</p>
                {subjects.map((subject) => (
                  <Link
                    key={subject.id}
                    to={`/subject/${subject.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive(`/subject/${subject.slug}`) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: subject.color }}>
                      {subject.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium">{subject.name}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
