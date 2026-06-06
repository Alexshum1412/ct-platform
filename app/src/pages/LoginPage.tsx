/**
 * Страница входа в систему
 * 
 * Поддерживает:
 * - Вход по email и паролю
 * - OAuth через Google
 * - OAuth через Telegram
 * 
 * Ссылки на API:
 * - POST /api/auth/login - вход по паролю
 * - GET /api/auth/google - OAuth Google
 * - GET /api/auth/telegram - OAuth Telegram
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '@/store/useAppStore';
import { API_BASE_URL } from '@/lib/api/client';

const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;
const TELEGRAM_AUTH_URL = `${API_BASE_URL}/auth/telegram`;

// =====================================================
// КОМПОНЕНТ LoginPage
// =====================================================

export function LoginPage() {
  const navigate = useNavigate();
  const { login, addNotification } = useAppStore();
  
  /** Email пользователя */
  const [email, setEmail] = useState('');
  /** Пароль пользователя */
  const [password, setPassword] = useState('');
  /** Показывать пароль */
  const [showPassword, setShowPassword] = useState(false);
  /** Состояние загрузки */
  const [isLoading, setIsLoading] = useState(false);
  /** Ошибки валидации */
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Общая ошибка формы */
  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------------------------------
  // ВАЛИДАЦИЯ
  // ---------------------------------------------------
  
  /**
   * Проверяет корректность введённых данных
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Валидация email
    if (!email) {
      newErrors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Некорректный email';
    }
    
    // Валидация пароля
    if (!password) {
      newErrors.password = 'Введите пароль';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------------------------------------------
  // ОБРАБОТЧИКИ
  // ---------------------------------------------------
  
  /**
   * Обработка отправки формы
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!validate()) return;
    
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Если email не подтверждён — ведём на ввод кода, иначе на главную.
      const verified = !!useAppStore.getState().user?.emailVerified;
      if (!verified) {
        navigate('/verify-email');
      } else {
        addNotification({
          type: 'success',
          title: 'Добро пожаловать!',
          message: 'Вы успешно вошли в систему',
        });
        navigate('/');
      }
    } else {
      setFormError(result.error || 'Ошибка входа');
    }

    setIsLoading(false);
  };
  
  /**
   * Вход через Google OAuth
   * 
   * ССЫЛКА: Перенаправление на /api/auth/google
   */
  const handleGoogleLogin = () => {
    // Перенаправляем на endpoint OAuth Google
    window.location.href = GOOGLE_AUTH_URL;
  };
  
  /**
   * Вход через Telegram OAuth
   * 
   * ССЫЛКА: Перенаправление на /api/auth/telegram
   */
  const handleTelegramLogin = () => {
    // Перенаправляем на endpoint OAuth Telegram
    window.location.href = TELEGRAM_AUTH_URL;
  };

  // ---------------------------------------------------
  // РЕНДЕР
  // ---------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Логотип */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl">CT-Platform</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Вход в систему</CardTitle>
            <CardDescription>
              Введите свои данные для входа
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Общая ошибка */}
            {formError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="text-sm font-medium mb-1.5 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                      errors.email ? 'border-red-500' : 'border-border'
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Пароль */}
              <div>
                <label htmlFor="password" className="text-sm font-medium mb-1.5 block">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-12 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                      errors.password ? 'border-red-500' : 'border-border'
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              {/* Ссылка на восстановление пароля */}
              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Забыли пароль?
                </Link>
              </div>

              {/* Кнопка входа */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Вход...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Войти
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Разделитель */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">или</span>
              </div>
            </div>

            {/* OAuth кнопки */}
            <div className="grid grid-cols-2 gap-3">
              {/* 
                ССЫЛКА: Google OAuth
                Открывает страницу авторизации Google
              */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              
              {/* 
                ССЫЛКА: Telegram OAuth
                Открывает страницу авторизации Telegram
              */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleTelegramLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Telegram
              </Button>
            </div>

            {/* Ссылка на регистрацию */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Ещё нет аккаунта?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>
        
        {/* Ссылки на юридические документы */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Входя в систему, вы соглашаетесь с{' '}
          <Link to="/terms" className="hover:underline">Условиями использования</Link>
          {' '}и{' '}
          <Link to="/privacy" className="hover:underline">Политикой конфиденциальности</Link>
        </p>
      </motion.div>
    </div>
  );
}

// Named export for lazy loading
export default LoginPage;
